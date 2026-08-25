import { deriveData } from "./candle";
import { pool } from "./db";
import { logger } from "./logger";
import type { StreamFill, StreamOrder } from "./types";

const orderBucket = new Map<string, StreamOrder>();
const fillBucket = new Map<string, StreamFill>();

let serviceUserIds = new Set<string>();

export async function loadServiceUserIds() {
	const result = await pool.query('SELECT id FROM "User" WHERE type = $1', ["SERVICE"]);
	serviceUserIds = new Set(result.rows.map((row) => row.id));
	logger.info(`Loaded ${serviceUserIds.size} service accounts for order filtering`);
}

export function queueOrder(order: StreamOrder) {
	if (serviceUserIds.has(order.userId)) return;

	orderBucket.set(order.id, order);
}

export function queueFill(fill: StreamFill) {
	deriveData({
		event: "trade",
		symbol: fill.symbol,
		id: fill.id,
		price: BigInt(fill.price),
		qty: BigInt(fill.qty),
		maker: fill.isBuyerMaker,
		timestamp: fill.createdAt,
	});

	fillBucket.set(fill.id, fill);
}

export async function flushBatch() {
	if (orderBucket.size === 0 && fillBucket.size === 0) return;

	const orders = [...orderBucket.entries()];
	const fills = [...fillBucket.entries()];
	orderBucket.clear();
	fillBucket.clear();

	try {
		if (orders.length > 0) await insertOrders(orders.map(([, order]) => order));
		if (fills.length > 0) await insertFills(fills.map(([, fill]) => fill));
	} catch (err) {
		logger.error("Failed to flush batch", err);

		for (const [id, order] of orders) {
			if (!orderBucket.has(id)) orderBucket.set(id, order);
		}
		for (const [id, fill] of fills) {
			if (!fillBucket.has(id)) fillBucket.set(id, fill);
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
