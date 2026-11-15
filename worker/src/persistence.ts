import { deriveData } from "./candle";
import { deriveTicker } from "./ticker";
import { pool } from "./db";
import { logger } from "./logger";
import { getMarket } from "./markets";
import {
	applyPositionChange,
	emptyPosition,
	positionKey,
	type PositionEventRecord,
	type PositionSide,
	type PositionState,
} from "./positions";
import { compareStreamIds, maxStreamId } from "./stream";
import type { StreamBalanceEvent, StreamFill, StreamOrder } from "./types";

interface BalanceEntry {
	id: string;
	event: StreamBalanceEvent;
}

interface PendingPositionEvent extends PositionEventRecord {
	streamId: string;
}

const orderBucket = new Map<string, StreamOrder>();
const fillBucket = new Map<string, StreamFill>();
const balanceHistoryBucket = new Map<string, BalanceEntry>();
const balanceBucket = new Map<string, BalanceEntry>();
const positionState = new Map<string, PositionState>();
const positionEventBucket = new Map<string, PendingPositionEvent>();
const appliedFillIds = new Set<string>();

let serviceUserIds = new Set<string>();
let positionCursor = "0-0";
let pendingPositionCursor: string | null = null;


export async function loadServiceUserIds() {
	const result = await pool.query('SELECT id FROM "User" WHERE type = $1', ["SERVICE"]);
	serviceUserIds = new Set(result.rows.map((row) => row.id));
	logger.info(`Loaded ${serviceUserIds.size} service accounts for order filtering`);
}

async function loadKnownUsers(ids: string[]) {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length === 0) return new Set<string>();

	const result = await pool.query<{ id: string }>(
		'SELECT id FROM "User" WHERE id = ANY($1::text[])',
		[uniqueIds],
	);

	return new Set(result.rows.map((row) => row.id));
}

interface PersistedPositionRow {
	userId: string;
	asset: string;
	qty: string;
	costBasis: string;
	realizedPnl: string;
	lastBuyPrice: string | null;
	lastBuyQty: string | null;
	lastBuyAt: Date | null;
	lastSellPrice: string | null;
	lastSellQty: string | null;
	lastSellAt: Date | null;
	tradeCount: number;
}

export async function loadPositionState() {
	const [positions, cursors, appliedFills] = await Promise.all([
		pool.query<PersistedPositionRow>(
			`SELECT "userId", asset, qty::text, "costBasis"::text, "realizedPnl"::text,
			        "lastBuyPrice"::text, "lastBuyQty"::text, "lastBuyAt",
			        "lastSellPrice"::text, "lastSellQty"::text, "lastSellAt", "tradeCount"
			 FROM "Position"`,
		),
		pool.query<{ lastEventId: string }>(
			'SELECT "lastEventId" FROM "ProjectionCursor" WHERE name = $1',
			["positions"],
		),
		pool.query<{ fillId: string }>('SELECT DISTINCT "fillId" FROM "PositionEvent"'),
	]);

	positionState.clear();
	for (const row of positions.rows) {
		positionState.set(positionKey(row.userId, row.asset), {
			qty: BigInt(row.qty),
			costBasis: BigInt(row.costBasis),
			realizedPnl: BigInt(row.realizedPnl),
			lastBuyPrice: row.lastBuyPrice == null ? null : BigInt(row.lastBuyPrice),
			lastBuyQty: row.lastBuyQty == null ? null : BigInt(row.lastBuyQty),
			lastBuyAt: row.lastBuyAt == null ? null : row.lastBuyAt.getTime(),
			lastSellPrice: row.lastSellPrice == null ? null : BigInt(row.lastSellPrice),
			lastSellQty: row.lastSellQty == null ? null : BigInt(row.lastSellQty),
			lastSellAt: row.lastSellAt == null ? null : row.lastSellAt.getTime(),
			tradeCount: row.tradeCount,
		});
	}

	appliedFillIds.clear();
	for (const row of appliedFills.rows) appliedFillIds.add(row.fillId);

	positionCursor = cursors.rows[0]?.lastEventId ?? "0-0";
	logger.info(
		`Loaded ${positionState.size} positions and ${appliedFillIds.size} applied fills from checkpoint ${positionCursor}`,
	);
}

export function queuePositionFill(fill: StreamFill, streamId: string) {
	if (compareStreamIds(streamId, positionCursor) <= 0) return;

	pendingPositionCursor = maxStreamId(pendingPositionCursor, streamId);

	if (appliedFillIds.has(fill.id)) return;

	const market = getMarket(fill.symbol);
	if (!market) throw new Error(`Unknown market for fill ${fill.id}: ${fill.symbol}`);

	appliedFillIds.add(fill.id);

	const price = BigInt(fill.price);
	const qty = BigInt(fill.qty);

	const applySide = (userId: string, side: PositionSide) => {
		if (serviceUserIds.has(userId)) return;

		const key = positionKey(userId, market.baseAsset);
		const before = positionState.get(key) ?? emptyPosition();
		const change = applyPositionChange(before, {
			fillId: fill.id,
			userId,
			asset: market.baseAsset,
			symbol: fill.symbol,
			side,
			price,
			qty,
			occurredAt: fill.createdAt,
			qtyPrecision: market.qtyPrecision,
		});

		positionState.set(key, change.after);
		positionEventBucket.set(`${fill.id}:${userId}`, {
			...change.event,
			streamId,
		});
	};

	applySide(fill.buyerId, "BUY");
	applySide(fill.sellerId, "SELL");
}

export function queueOrder(order: StreamOrder) {
	if (serviceUserIds.has(order.userId)) return;

	orderBucket.set(order.id, order);
}

export function queueFill(fill: StreamFill) {
	const trade = {
		event: "trade" as const,
		symbol: fill.symbol,
		id: fill.id,
		price: BigInt(fill.price),
		qty: BigInt(fill.qty),
		maker: fill.isBuyerMaker,
		timestamp: fill.createdAt,
	};

	deriveData(trade);
	deriveTicker(trade);

	fillBucket.set(fill.id, fill);
}

export function queueBalance(id: string, event: StreamBalanceEvent) {
	const entry = { id, event };

	balanceHistoryBucket.set(id, entry);
	balanceBucket.set(`${event.userId}:${event.asset}`, entry);
}

export async function flushBatch() {
	if (
		orderBucket.size === 0 &&
		fillBucket.size === 0 &&
		balanceHistoryBucket.size === 0 &&
		positionEventBucket.size === 0 &&
		pendingPositionCursor == null
	)
		return;

	const orders = [...orderBucket.entries()];
	const fills = [...fillBucket.entries()];
	const balanceHistory = [...balanceHistoryBucket.entries()];
	const latestBalances = [...balanceBucket.values()];
	const positionEvents = [...positionEventBucket.values()];
	const nextPositionCursor = pendingPositionCursor;

	// Snapshot position state alongside the events and cursor captured above.
	// New events can be queued while this flush is awaiting I/O, and persisting
	// their state without their cursor would double-apply them after a restart.
	const capturedPositions = new Map<
		string,
		{ userId: string; asset: string; state: PositionState }
	>();
	for (const event of positionEvents) {
		const key = positionKey(event.userId, event.asset);
		if (capturedPositions.has(key)) continue;

		const state = positionState.get(key);
		if (state) {
			capturedPositions.set(key, {
				userId: event.userId,
				asset: event.asset,
				state: { ...state },
			});
		}
	}

	orderBucket.clear();
	fillBucket.clear();
	balanceHistoryBucket.clear();
	balanceBucket.clear();
	positionEventBucket.clear();

	try {
		const knownUsers = await loadKnownUsers([
			...orders.map(([, order]) => order.userId),
			...fills.flatMap(([, fill]) => [fill.buyerId, fill.sellerId]),
			...balanceHistory.map(([, entry]) => entry.event.userId),
			...latestBalances.map(({ event }) => event.userId),
			...positionEvents.map((event) => event.userId),
		]);

		const validOrders = orders.filter(([, order]) => knownUsers.has(order.userId));
		const validFills = fills.filter(
			([, fill]) => knownUsers.has(fill.buyerId) && knownUsers.has(fill.sellerId),
		);
		const validBalanceHistory = balanceHistory.filter(([, entry]) =>
			knownUsers.has(entry.event.userId),
		);
		const validLatestBalances = latestBalances.filter(({ event }) =>
			knownUsers.has(event.userId),
		);
		const validPositionEvents = positionEvents.filter((event) =>
			knownUsers.has(event.userId),
		);

		const validPositionKeys = new Set(
			validPositionEvents.map((event) => positionKey(event.userId, event.asset)),
		);
		for (const key of capturedPositions.keys()) {
			if (!validPositionKeys.has(key)) capturedPositions.delete(key);
		}

		const droppedOrders = orders.length - validOrders.length;
		const droppedFills = fills.length - validFills.length;
		const droppedHistory = balanceHistory.length - validBalanceHistory.length;
		const droppedBalances = latestBalances.length - validLatestBalances.length;
		const droppedPositions = positionEvents.length - validPositionEvents.length;

		if (
			droppedOrders ||
			droppedFills ||
			droppedHistory ||
			droppedBalances ||
			droppedPositions
		) {
			logger.warn("Dropped engine events for deleted users", {
				orders: droppedOrders,
				fills: droppedFills,
				balanceHistory: droppedHistory,
				balances: droppedBalances,
				positions: droppedPositions,
			});
		}

		if (validBalanceHistory.length > 0)
			await insertBalanceHistory(validBalanceHistory.map(([, entry]) => entry));
		if (validLatestBalances.length > 0) await upsertBalances(validLatestBalances);
		if (validPositionEvents.length > 0 || nextPositionCursor != null) {
			await persistPositions(validPositionEvents, capturedPositions, nextPositionCursor);
		}
		if (validOrders.length > 0) await insertOrders(validOrders.map(([, order]) => order));
		if (validFills.length > 0) await insertFills(validFills.map(([, fill]) => fill));

		if (nextPositionCursor != null) {
			positionCursor = maxStreamId(positionCursor, nextPositionCursor);
			pendingPositionCursor = null;
		}
	} catch (err) {
		logger.error("Failed to flush batch", err);

		for (const [id, order] of orders) {
			if (!orderBucket.has(id)) orderBucket.set(id, order);
		}
		for (const [id, fill] of fills) {
			if (!fillBucket.has(id)) fillBucket.set(id, fill);
		}
		for (const [id, entry] of balanceHistory) {
			if (!balanceHistoryBucket.has(id)) balanceHistoryBucket.set(id, entry);
		}
		for (const entry of latestBalances) {
			const key = `${entry.event.userId}:${entry.event.asset}`;
			if (!balanceBucket.has(key)) balanceBucket.set(key, entry);
		}
		for (const event of positionEvents) {
			const key = `${event.fillId}:${event.userId}`;
			if (!positionEventBucket.has(key)) positionEventBucket.set(key, event);
		}
		throw err;
	}
}

async function persistPositions(
	events: PendingPositionEvent[],
	positions: Map<string, { userId: string; asset: string; state: PositionState }>,
	cursor: string | null,
) {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		for (let offset = 0; offset < events.length; offset += 500) {
			const chunk = events.slice(offset, offset + 500);
			const values: unknown[] = [];
			const rows = chunk.map((event, i) => {
				const b = i * 13;
				values.push(
					crypto.randomUUID(),
					event.fillId,
					event.userId,
					event.asset,
					event.symbol,
					event.side,
					event.price,
					event.qty,
					event.quoteAmount,
					event.costBasisBefore,
					event.costBasisAfter,
					event.realizedPnl,
					new Date(event.occurredAt),
				);
				const p = (n: number) => `$${b + n}`;
				return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ${p(12)}, ${p(13)})`;
			});

			await client.query(
				`INSERT INTO "PositionEvent" (id, "fillId", "userId", asset, symbol, side, price, qty, "quoteAmount", "costBasisBefore", "costBasisAfter", "realizedPnl", "occurredAt")
				 VALUES ${rows.join(", ")}
				 ON CONFLICT ("fillId", "userId") DO NOTHING`,
				values,
			);
		}

		const positionRows = [...positions.values()];
		for (let offset = 0; offset < positionRows.length; offset += 500) {
			const chunk = positionRows.slice(offset, offset + 500);
			const values: unknown[] = [];
			const rows = chunk.map(({ userId, asset, state }, i) => {
				const b = i * 13;
				values.push(
					userId,
					asset,
					state.qty,
					state.costBasis,
					state.realizedPnl,
					state.lastBuyPrice,
					state.lastBuyQty,
					state.lastBuyAt == null ? null : new Date(state.lastBuyAt),
					state.lastSellPrice,
					state.lastSellQty,
					state.lastSellAt == null ? null : new Date(state.lastSellAt),
					state.tradeCount,
					new Date(),
				);
				const p = (n: number) => `$${b + n}`;
				return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ${p(12)}, ${p(13)})`;
			});

			await client.query(
				`INSERT INTO "Position" ("userId", asset, qty, "costBasis", "realizedPnl", "lastBuyPrice", "lastBuyQty", "lastBuyAt", "lastSellPrice", "lastSellQty", "lastSellAt", "tradeCount", "updatedAt")
				 VALUES ${rows.join(", ")}
				 ON CONFLICT ("userId", asset) DO UPDATE SET
				   qty = EXCLUDED.qty,
				   "costBasis" = EXCLUDED."costBasis",
				   "realizedPnl" = EXCLUDED."realizedPnl",
				   "lastBuyPrice" = EXCLUDED."lastBuyPrice",
				   "lastBuyQty" = EXCLUDED."lastBuyQty",
				   "lastBuyAt" = EXCLUDED."lastBuyAt",
				   "lastSellPrice" = EXCLUDED."lastSellPrice",
				   "lastSellQty" = EXCLUDED."lastSellQty",
				   "lastSellAt" = EXCLUDED."lastSellAt",
				   "tradeCount" = EXCLUDED."tradeCount",
				   "updatedAt" = EXCLUDED."updatedAt"`,
				values,
			);
		}

		if (cursor != null) {
			await client.query(
				`INSERT INTO "ProjectionCursor" (name, "lastEventId", "updatedAt")
				 VALUES ($1, $2, now())
				 ON CONFLICT (name) DO UPDATE SET
				   "lastEventId" = EXCLUDED."lastEventId",
				   "updatedAt" = now()`,
				["positions", cursor],
			);
		}

		await client.query("COMMIT");
	} catch (err) {
		await client.query("ROLLBACK").catch(() => undefined);
		throw err;
	} finally {
		client.release();
	}
}

async function insertOrders(orders: StreamOrder[]) {
	const values: unknown[] = [];
	const rows = orders.map((order, i) => {
		const b = i * 13;
		values.push(
			order.id,
			order.userId,
			order.symbol,
			order.price != null ? BigInt(order.price) : null,
			BigInt(order.qty),
			order.type,
			order.side,
			BigInt(order.filledQty),
			order.status,
			order.lockedAmount != null ? BigInt(order.lockedAmount) : null,
			BigInt(order.spentAmount),
			order.averagePrice != null ? BigInt(order.averagePrice) : null,
			new Date(order.createdAt),
		);
		const p = (n: number) => `$${b + n}`;
		return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ${p(12)}, ${p(13)})`;
	});

	await pool.query(
		`INSERT INTO "Order" (id, "userId", symbol, price, qty, type, side, "filledQty", status, "lockedAmount", "spentAmount", "averagePrice", "createdAt")
         VALUES ${rows.join(", ")}
         ON CONFLICT (id) DO UPDATE SET
           "filledQty" = EXCLUDED."filledQty",
           status = EXCLUDED.status,
           "lockedAmount" = EXCLUDED."lockedAmount",
           "spentAmount" = EXCLUDED."spentAmount",
           "averagePrice" = EXCLUDED."averagePrice"`,
		values,
	);
}

async function insertFills(fills: StreamFill[]) {
	const values: unknown[] = [];
	const rows = fills.map((fill, i) => {
		const b = i * 10;
		values.push(
			fill.id,
			fill.symbol,
			BigInt(fill.price),
			BigInt(fill.qty),
			fill.isBuyerMaker,
			fill.buyOrderId,
			fill.sellOrderId,
			fill.buyerId,
			fill.sellerId,
			new Date(fill.createdAt),
		);
		const p = (n: number) => `$${b + n}`;
		return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)})`;
	});

	await pool.query(
		`INSERT INTO "Fill" (id, symbol, price, qty, "isBuyerMaker", "buyOrderId", "sellOrderId", "buyerId", "sellerId", "createdAt")
         VALUES ${rows.join(", ")}
         ON CONFLICT (id) DO NOTHING`,
		values,
	);
}

async function insertBalanceHistory(entries: BalanceEntry[]) {
	const values: unknown[] = [];
	const rows = entries.map(({ id, event }, i) => {
		const b = i * 11;
		values.push(
			id,
			event.userId,
			event.asset,
			BigInt(event.available),
			BigInt(event.locked),
			BigInt(event.deltaAvailable),
			BigInt(event.deltaLocked),
			event.reason,
			event.referenceId,
			event.symbol,
			new Date(event.occurredAt),
		);
		const p = (n: number) => `$${b + n}`;
		return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)})`;
	});

	await pool.query(
		`INSERT INTO "BalanceHistory" (id, "userId", asset, available, locked, "deltaAvailable", "deltaLocked", reason, "referenceId", symbol, "occurredAt")
         VALUES ${rows.join(", ")}
         ON CONFLICT (id) DO NOTHING`,
		values,
	);
}

async function upsertBalances(entries: BalanceEntry[]) {
	const values: unknown[] = [];
	const rows = entries.map(({ event }, i) => {
		const b = i * 5;
		values.push(
			event.userId,
			event.asset,
			BigInt(event.available),
			BigInt(event.locked),
			new Date(event.occurredAt),
		);
		const p = (n: number) => `$${b + n}`;
		return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)})`;
	});

	await pool.query(
		`INSERT INTO "Balance" ("userId", asset, available, locked, "updatedAt")
         VALUES ${rows.join(", ")}
         ON CONFLICT ("userId", asset) DO UPDATE SET
           available = EXCLUDED.available,
           locked = EXCLUDED.locked,
           "updatedAt" = EXCLUDED."updatedAt"`,
		values,
	);
}
