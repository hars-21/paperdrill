import "dotenv/config";
import { pool } from "./db";
import { logger } from "./logger";
import { listMarkets, loadMarkets, type WorkerMarket } from "./markets";
import { positionKey } from "./positions";
import { persistPositionProjections } from "./positionStore";
import {
	buildSeedPositions,
	computeNetQuantities,
	diffBalanceQuantities,
	replayFills,
	type ReplayBalance,
	type ReplayFill,
	type ReplayPosition,
} from "./portfolioReplay";

const CONTRIBUTION_REASONS = ["initialized", "deposited", "credited"];
const BATCH_SIZE = 500;

interface UserRow {
	id: string;
	type: "USER" | "SERVICE";
	pnlBaseline: string | null;
	pnlBaselineAt: Date | null;
}

interface StoredPositionRow {
	userId: string;
	asset: string;
	qty: string;
}

interface ContributionRow {
	userId: string;
	net: string;
	firstAt: Date;
}

interface BaselineContribution {
	net: bigint;
	firstAt: Date;
}

interface ProjectionDrift {
	userId: string;
	asset: string;
	stored: bigint;
	replayed: bigint;
}

function usage() {
	console.log(`Usage: bun run backfill:positions [options]

Replays the Fill ledger through weighted-average cost and writes the Position
and PositionEvent projections. Also repairs pnlBaseline from quote-asset
BalanceHistory so deposits and credits are not counted as trading profit.

Options:
  --reset   Delete existing Position and PositionEvent rows before replaying.
  --check   Report drift without writing anything. Exits with 1 when found.
  --help    Show this message.`);
}

function quoteAssetOf(markets: Map<string, WorkerMarket>) {
	const assets = new Set([...markets.values()].map((market) => market.quoteAsset));
	if (assets.size !== 1) {
		throw new Error("Backfill requires markets to share one quote asset");
	}
	return assets.values().next().value as string;
}

async function loadUsers() {
	const result = await pool.query<UserRow>(
		`SELECT id, type, "pnlBaseline"::text AS "pnlBaseline", "pnlBaselineAt"
		 FROM "User"`,
	);
	return result.rows;
}

async function loadFills() {
	const result = await pool.query<{
		id: string;
		symbol: string;
		price: string;
		qty: string;
		buyerId: string;
		sellerId: string;
		createdAt: Date;
	}>(
		`SELECT id, symbol, price::text, qty::text, "buyerId", "sellerId", "createdAt"
		 FROM "Fill"
		 ORDER BY "createdAt" ASC, id ASC`,
	);

	return result.rows.map<ReplayFill>((row) => ({
		id: row.id,
		symbol: row.symbol,
		price: row.price,
		qty: row.qty,
		buyerId: row.buyerId,
		sellerId: row.sellerId,
		createdAt: row.createdAt.getTime(),
	}));
}

async function loadBalances() {
	const result = await pool.query<{
		userId: string;
		asset: string;
		available: string;
		locked: string;
	}>(`SELECT "userId", asset, available::text, locked::text FROM "Balance"`);

	return result.rows.map<ReplayBalance>((row) => ({
		userId: row.userId,
		asset: row.asset,
		available: BigInt(row.available),
		locked: BigInt(row.locked),
	}));
}

async function loadSeedPrices(fills: ReplayFill[]) {
	const prices = new Map<string, bigint>();

	const candles = await pool.query<{ symbol: string; close: string }>(
		`SELECT DISTINCT ON (symbol) symbol, close::text
		 FROM "Candle"
		 ORDER BY symbol, time DESC`,
	);
	for (const row of candles.rows) prices.set(row.symbol, BigInt(row.close));

	// Fill prices are a fallback for markets that have not closed a candle yet.
	for (let index = fills.length - 1; index >= 0; index--) {
		const fill = fills[index];
		if (!fill || prices.has(fill.symbol)) continue;
		prices.set(fill.symbol, BigInt(fill.price));
	}

	return prices;
}

async function loadContributions(quoteAsset: string, userIds: string[]) {
	if (userIds.length === 0) return new Map<string, BaselineContribution>();

	const result = await pool.query<ContributionRow>(
		`SELECT "userId", SUM("deltaAvailable")::text AS net, MIN("occurredAt") AS "firstAt"
		 FROM "BalanceHistory"
		 WHERE asset = $1 AND reason = ANY($2::text[]) AND "userId" = ANY($3::text[])
		 GROUP BY "userId"`,
		[quoteAsset, CONTRIBUTION_REASONS, userIds],
	);

	return new Map(
		result.rows.map((row) => [
			row.userId,
			{ net: BigInt(row.net), firstAt: row.firstAt },
		]),
	);
}

async function loadStoredPositions() {
	const result = await pool.query<StoredPositionRow>(
		`SELECT "userId", asset, qty::text FROM "Position"`,
	);

	const stored = new Map<string, bigint>();
	for (const row of result.rows) {
		stored.set(positionKey(row.userId, row.asset), BigInt(row.qty));
	}
	return stored;
}

function diffStoredPositions(
	replayed: ReplayPosition[],
	stored: ReadonlyMap<string, bigint>,
) {
	const replayedQty = new Map<string, bigint>();
	const owners = new Map<string, { userId: string; asset: string }>();

	for (const position of replayed) {
		const key = positionKey(position.userId, position.asset);
		replayedQty.set(key, position.state.qty);
		owners.set(key, { userId: position.userId, asset: position.asset });
	}

	for (const [key, qty] of stored) {
		if (!owners.has(key)) {
			const separator = key.indexOf(":");
			owners.set(key, {
				userId: key.slice(0, separator),
				asset: key.slice(separator + 1),
			});
		}
	}

	const drift: ProjectionDrift[] = [];
	for (const key of new Set([...replayedQty.keys(), ...stored.keys()])) {
		const owner = owners.get(key);
		if (!owner) continue;

		const left = stored.get(key) ?? 0n;
		const right = replayedQty.get(key) ?? 0n;
		if (left === right) continue;

		drift.push({ ...owner, stored: left, replayed: right });
	}

	return drift.sort((a, b) =>
		a.userId === b.userId ? a.asset.localeCompare(b.asset) : a.userId.localeCompare(b.userId),
	);
}

function diffBaselines(
	userId: string,
	users: UserRow[],
	contributions: ReadonlyMap<string, BaselineContribution>,
) {
	const user = users.find((item) => item.id === userId);
	const expected = contributions.get(userId);
	if (!user || !expected) return null;

	const stored = user.pnlBaseline == null ? null : BigInt(user.pnlBaseline);
	if (stored === expected.net) return null;

	return { userId, stored, expected: expected.net };
}

async function resetProjections() {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		const events = await client.query('DELETE FROM "PositionEvent"');
		const positions = await client.query('DELETE FROM "Position"');
		await client.query("COMMIT");

		logger.warn("Cleared position projections", {
			events: events.rowCount ?? 0,
			positions: positions.rowCount ?? 0,
		});
	} catch (err) {
		await client.query("ROLLBACK").catch(() => undefined);
		throw err;
	} finally {
		client.release();
	}
}

async function repairBaselines(
	contributions: ReadonlyMap<string, BaselineContribution>,
) {
	const rows = [...contributions.entries()];
	let updated = 0;

	for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
		const chunk = rows.slice(offset, offset + BATCH_SIZE);
		const values: unknown[] = [];
		const tuples = chunk.map(([userId, value], index) => {
			const base = index * 3;
			values.push(userId, value.net, value.firstAt);
			return `($${base + 1}::text, $${base + 2}::bigint, $${base + 3}::timestamptz)`;
		});

		const result = await pool.query(
			`UPDATE "User" AS u
			 SET "pnlBaseline" = v.net,
			     "pnlBaselineAt" = COALESCE(u."pnlBaselineAt", v.first_at),
			     "updatedAt" = now()
			 FROM (VALUES ${tuples.join(", ")}) AS v(id, net, first_at)
			 WHERE u.id = v.id`,
			values,
		);

		updated += result.rowCount ?? 0;
	}

	return updated;
}

async function run(options: { reset: boolean; check: boolean }) {
	await loadMarkets();

	const markets = new Map(listMarkets().map((market) => [market.symbol, market]));
	if (markets.size === 0) throw new Error("No markets found");

	const quoteAsset = quoteAssetOf(markets);
	const users = await loadUsers();
	const knownUsers = new Set(
		users.filter((user) => user.type === "USER").map((user) => user.id),
	);

	const fills = await loadFills();
	const balances = await loadBalances();
	const prices = await loadSeedPrices(fills);

	const netQuantities = computeNetQuantities(fills, markets, knownUsers);
	const seeds = buildSeedPositions(
		balances,
		netQuantities,
		prices,
		markets,
		knownUsers,
	);
	const { positions, events } = replayFills(
		fills,
		seeds.positions,
		markets,
		knownUsers,
	);

	const contributions = await loadContributions(quoteAsset, [...knownUsers]);

	if (options.check) {
		const balanceDrift = diffBalanceQuantities(
			positions,
			balances,
			markets,
			knownUsers,
		);
		const projectionDrift = diffStoredPositions(
			positions,
			await loadStoredPositions(),
		);
		const baselineDrift = [...knownUsers]
			.map((userId) => diffBaselines(userId, users, contributions))
			.filter((row): row is NonNullable<typeof row> => row != null);

		for (const row of balanceDrift.slice(0, 20)) {
			logger.warn("Position and balance drift", {
				userId: row.userId,
				asset: row.asset,
				projected: row.projected.toString(),
				balance: row.balance.toString(),
			});
		}
		for (const row of projectionDrift.slice(0, 20)) {
			logger.warn("Stored and replayed position drift", {
				userId: row.userId,
				asset: row.asset,
				stored: row.stored.toString(),
				replayed: row.replayed.toString(),
			});
		}
		for (const row of baselineDrift.slice(0, 20)) {
			logger.warn("PnL baseline drift", {
				userId: row.userId,
				stored: row.stored?.toString() ?? null,
				expected: row.expected.toString(),
			});
		}

		const drift = balanceDrift.length + projectionDrift.length + baselineDrift.length;
		logger.info("Projection check complete", {
			fills: fills.length,
			positions: positions.length,
			events: events.length,
			seeded: seeds.positions.length,
			unpriced: seeds.unpriced.length,
			balanceDrift: balanceDrift.length,
			projectionDrift: projectionDrift.length,
			baselineDrift: baselineDrift.length,
		});

		if (drift > 0) process.exitCode = 1;
		return;
	}

	if (options.reset) await resetProjections();

	await persistPositionProjections(pool, events, positions, null);
	const baselinesUpdated = await repairBaselines(contributions);

	logger.info("Portfolio backfill complete", {
		fills: fills.length,
		positions: positions.length,
		events: events.length,
		seeded: seeds.positions.length,
		unpriced: seeds.unpriced.length,
		baselinesUpdated,
	});
}

if (import.meta.main) {
	const args = new Set(process.argv.slice(2));

	if (args.has("--help")) {
		usage();
	} else if (args.has("--check") && args.has("--reset")) {
		logger.error("--check cannot be combined with --reset");
		process.exitCode = 1;
	} else {
		run({ reset: args.has("--reset"), check: args.has("--check") })
			.catch((err) => {
				logger.error("Portfolio backfill failed", err);
				process.exitCode = 1;
			})
			.finally(() => pool.end());
	}
}
