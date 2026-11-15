import { pool } from "./db";
import { logger } from "./logger";
import { listMarkets, type WorkerMarket } from "./markets";
import { publisher } from "./redis";
import {
	buildAccountSnapshot,
	type AccountSnapshot,
	type SnapshotPositionInput,
} from "./accountSnapshot";
import { getUserPositions, isServiceUser } from "./persistence";
import { emptyPosition, type PositionState } from "./positions";
import { getLastPrice } from "./ticker";
import type { StreamBalanceEvent } from "./types";

const SNAPSHOT_KEY_PREFIX = "portfolio:snapshot:";
const ACCOUNT_CHANNEL_PREFIX = "account:";
const SNAPSHOT_TTL_SECONDS = 15 * 60;
const SNAPSHOT_PERSIST_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 10_000;
const HEARTBEAT_MS = 5 * 60 * 1000;
const SCAN_INTERVAL_MS = 60_000;

interface AccountBalance {
	available: bigint;
	locked: bigint;
}

interface AccountState {
	balances: Map<string, AccountBalance>;
	contributions: bigint;
	dirty: boolean;
	publishing: boolean;
	version: number;
	lastPublishedAt: number;
	lastPersistedAt: number;
	timer: ReturnType<typeof setTimeout> | null;
}

const accounts = new Map<string, AccountState>();
const baselines = new Map<string, bigint>();

let markets = new Map<string, WorkerMarket>();
let marketsByAsset = new Map<string, WorkerMarket>();
let quoteAsset = "USD";
let quotePrecision = 2;
let heartbeat: ReturnType<typeof setInterval> | null = null;

function snapshotKey(userId: string) {
	return `${SNAPSHOT_KEY_PREFIX}${userId}`;
}

function accountChannel(userId: string) {
	return `${ACCOUNT_CHANNEL_PREFIX}${userId}`;
}

function indexMarkets(loaded: WorkerMarket[]) {
	markets = new Map(loaded.map((market) => [market.symbol, market]));
	marketsByAsset = new Map();

	const quoteAssets = new Set(loaded.map((market) => market.quoteAsset));
	if (quoteAssets.size !== 1) {
		throw new Error("Account snapshots require markets to share one quote asset");
	}

	quoteAsset = quoteAssets.values().next().value as string;
	const quote = loaded.find((market) => market.quoteAsset === quoteAsset);
	if (!quote) throw new Error("Missing quote market for account snapshots");
	quotePrecision = quote.pricePrecision;

	for (const market of loaded) {
		if (!marketsByAsset.has(market.baseAsset)) {
			marketsByAsset.set(market.baseAsset, market);
		}
	}
}

function createAccount(contributions: bigint): AccountState {
	return {
		balances: new Map(),
		contributions,
		dirty: false,
		publishing: false,
		version: 0,
		lastPublishedAt: 0,
		lastPersistedAt: 0,
		timer: null,
	};
}

function ensureAccount(userId: string) {
	if (isServiceUser(userId)) return null;

	let account = accounts.get(userId);
	if (!account) {
		account = createAccount(baselines.get(userId) ?? 0n);
		accounts.set(userId, account);
	}

	return account;
}

export async function loadAccounts() {
	indexMarkets(listMarkets());

	const [users, balances] = await Promise.all([
		pool.query<{ id: string; pnlBaseline: string | null }>(
			`SELECT id, "pnlBaseline"::text AS "pnlBaseline" FROM "User" WHERE type = 'USER'`,
		),
		pool.query<{
			userId: string;
			asset: string;
			available: string;
			locked: string;
		}>(`SELECT "userId", asset, available::text, locked::text FROM "Balance"`),
	]);

	accounts.clear();
	baselines.clear();

	for (const row of users.rows) {
		baselines.set(row.id, row.pnlBaseline == null ? 0n : BigInt(row.pnlBaseline));
	}

	for (const row of balances.rows) {
		const account = ensureAccount(row.userId);
		if (!account) continue;

		account.balances.set(row.asset, {
			available: BigInt(row.available),
			locked: BigInt(row.locked),
		});
	}

	logger.info(
		`Loaded ${accounts.size} accounts and ${baselines.size} PnL baselines for snapshots`,
	);
}

export function applyAccountBalance(event: StreamBalanceEvent) {
	const account = ensureAccount(event.userId);
	if (!account) return;

	account.balances.set(event.asset, {
		available: BigInt(event.available),
		locked: BigInt(event.locked),
	});

	const contribution =
		event.reason === "initialized" ||
		event.reason === "deposited" ||
		event.reason === "credited";

	if (!contribution) return;

	if (event.asset === quoteAsset) {
		account.contributions += BigInt(event.deltaAvailable);
	}
	markAccountDirty(event.userId);
}

function schedulePublish(userId: string, delay: number) {
	const account = accounts.get(userId);
	if (!account || account.timer) return;

	account.timer = setTimeout(() => {
		account.timer = null;
		void publishAccount(userId);
	}, delay);
	account.timer.unref?.();
}

export function markAccountDirty(userId: string, immediate = false) {
	const account = ensureAccount(userId);
	if (!account) return;

	account.version += 1;
	account.dirty = true;

	if (account.publishing || account.timer) return;
	schedulePublish(userId, immediate ? 0 : DEBOUNCE_MS);
}

function buildSnapshot(userId: string, account: AccountState): AccountSnapshot {
	const positions = getUserPositions(userId);
	const byAsset = new Map<string, PositionState>();
	for (const position of positions) byAsset.set(position.asset, position.state);

	const inputs: SnapshotPositionInput[] = [];

	for (const [asset, state] of byAsset) {
		const balance = account.balances.get(asset);
		inputs.push({
			asset,
			state,
			available: balance?.available ?? 0n,
			locked: balance?.locked ?? 0n,
		});
	}

	for (const [asset, balance] of account.balances) {
		if (asset === quoteAsset || byAsset.has(asset)) continue;
		if (!marketsByAsset.has(asset)) continue;

		const total = balance.available + balance.locked;
		if (total === 0n) continue;

		inputs.push({
			asset,
			state: { ...emptyPosition(), qty: total },
			available: balance.available,
			locked: balance.locked,
			partial: true,
		});
	}

	const prices = new Map<string, bigint>();
	for (const market of markets.values()) {
		const price = getLastPrice(market.symbol);
		if (price != null) prices.set(market.symbol, price);
	}

	const cashBalance = account.balances.get(quoteAsset);
	const cash = (cashBalance?.available ?? 0n) + (cashBalance?.locked ?? 0n);

	return buildAccountSnapshot({
		userId,
		at: Date.now(),
		quoteAsset,
		quotePrecision,
		cash,
		contributions: account.contributions,
		positions: inputs,
		prices,
		markets,
	});
}

async function persistSnapshot(snapshot: AccountSnapshot) {
	await pool.query(
		`INSERT INTO "PortfolioSnapshot" (id, "userId", at, "quoteAsset", cash, "positionsValue", equity, "realizedPnl", "unrealizedPnl", "netContributions", partial)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		[
			crypto.randomUUID(),
			snapshot.userId,
			new Date(snapshot.at),
			snapshot.quoteAsset,
			snapshot.cash,
			snapshot.positionsValue,
			snapshot.equity,
			snapshot.realizedPnl,
			snapshot.unrealizedPnl,
			snapshot.netContributions,
			snapshot.partial,
		],
	);
}

async function publishAccount(userId: string) {
	const account = accounts.get(userId);
	if (!account || account.publishing) return;

	account.publishing = true;
	const version = account.version;
	account.dirty = false;

	try {
		const snapshot = buildSnapshot(userId, account);
		const payload = JSON.stringify(snapshot);

		await Promise.all([
			publisher.set(snapshotKey(userId), payload, { EX: SNAPSHOT_TTL_SECONDS }),
			publisher.publish(accountChannel(userId), payload),
		]);

		account.lastPublishedAt = snapshot.at;

		if (snapshot.at - account.lastPersistedAt >= SNAPSHOT_PERSIST_INTERVAL_MS) {
			await persistSnapshot(snapshot);
			account.lastPersistedAt = snapshot.at;
		}
	} catch (err) {
		account.dirty = true;
		logger.error("Failed to update account snapshot", {
			userId,
			error: err instanceof Error ? err.message : String(err),
		});
	} finally {
		account.publishing = false;

		if (account.dirty || account.version !== version) {
			account.dirty = true;
			schedulePublish(userId, DEBOUNCE_MS);
		}
	}
}

export function startAccountSnapshots() {
	if (heartbeat) return;

	heartbeat = setInterval(() => {
		const now = Date.now();

		for (const [userId, account] of accounts) {
			if (account.dirty || account.timer || account.publishing) continue;
			if (account.lastPublishedAt !== 0 && now - account.lastPublishedAt < HEARTBEAT_MS) {
				continue;
			}

			const hasOpenPositions = getUserPositions(userId).some(
				(position) => position.state.qty > 0n,
			);
			if (!hasOpenPositions) continue;

			markAccountDirty(userId, true);
		}
	}, SCAN_INTERVAL_MS);
	heartbeat.unref?.();

	logger.info("Account snapshot publisher started");
}

export async function flushAccountSnapshots() {
	if (heartbeat) {
		clearInterval(heartbeat);
		heartbeat = null;
	}

	for (const account of accounts.values()) {
		if (!account.timer) continue;
		clearTimeout(account.timer);
		account.timer = null;
	}

	const pending = [...accounts.entries()]
		.filter(([, account]) => account.dirty)
		.map(([userId]) => publishAccount(userId));

	await Promise.allSettled(pending);
}
