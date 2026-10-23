import { deriveData } from "./candle";
import { deriveTicker } from "./ticker";
import { pool } from "./db";
import { logger } from "./logger";
import type { StreamBalanceEvent, StreamFill, StreamOrder } from "./types";

interface BalanceEntry {
	id: string;
	event: StreamBalanceEvent;
}

const orderBucket = new Map<string, StreamOrder>();
const fillBucket = new Map<string, StreamFill>();
const balanceHistoryBucket = new Map<string, BalanceEntry>();
const balanceBucket = new Map<string, BalanceEntry>();

let serviceUserIds = new Set<string>();

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
		balanceHistoryBucket.size === 0
	)
		return;

	const orders = [...orderBucket.entries()];
	const fills = [...fillBucket.entries()];
	const balanceHistory = [...balanceHistoryBucket.entries()];
	const latestBalances = [...balanceBucket.values()];

	orderBucket.clear();
	fillBucket.clear();
	balanceHistoryBucket.clear();
	balanceBucket.clear();

	try {
		const knownUsers = await loadKnownUsers([
			...orders.map(([, order]) => order.userId),
			...fills.flatMap(([, fill]) => [fill.buyerId, fill.sellerId]),
			...balanceHistory.map(([, entry]) => entry.event.userId),
			...latestBalances.map(({ event }) => event.userId),
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

		const droppedOrders = orders.length - validOrders.length;
		const droppedFills = fills.length - validFills.length;
		const droppedHistory = balanceHistory.length - validBalanceHistory.length;
		const droppedBalances = latestBalances.length - validLatestBalances.length;

		if (droppedOrders || droppedFills || droppedHistory || droppedBalances) {
			logger.warn("Dropped engine events for deleted users", {
				orders: droppedOrders,
				fills: droppedFills,
				balanceHistory: droppedHistory,
				balances: droppedBalances,
			});
		}

		if (validBalanceHistory.length > 0)
			await insertBalanceHistory(validBalanceHistory.map(([, entry]) => entry));
		if (validLatestBalances.length > 0) await upsertBalances(validLatestBalances);
		if (validOrders.length > 0) await insertOrders(validOrders.map(([, order]) => order));
		if (validFills.length > 0) await insertFills(validFills.map(([, fill]) => fill));
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
		throw err;
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
