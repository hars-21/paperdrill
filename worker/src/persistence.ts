import { deriveData } from "./candle";
import { pool } from "./db";
import { logger } from "./logger";
import type { StreamFill, StreamOrder } from "./types";

const orderBucket = new Map<string, StreamOrder>();
const fillBucket = new Map<string, StreamFill>();

export function queueOrder(order: StreamOrder) {
	orderBucket.set(order.orderId, order);
}

export function queueFill(fill: StreamFill) {
	deriveData({
		event: "trade",
		symbol: fill.symbol,
		price: BigInt(fill.price),
		qty: BigInt(fill.qty),
		maker: fill.isBuyerMaker,
		id: 0,
		timestamp: fill.createdAt,
	});

	fillBucket.set(fill.fillId, fill);
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
		const b = i * 11;
		values.push(
			order.orderId,
			order.userId,
			order.symbol,
			order.price != null ? BigInt(order.price) : null,
			BigInt(order.qty),
			order.type,
			order.side,
			BigInt(order.filledQty),
			order.status,
			order.averagePrice != null ? BigInt(order.averagePrice) : null,
			new Date(order.createdAt),
		);
		const p = (n: number) => `$${b + n}`;
		return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)})`;
	});

	await pool.query(
		`INSERT INTO "Order" (id, "userId", symbol, price, qty, type, side, "filledQty", status, "averagePrice", "createdAt")
         VALUES ${rows.join(", ")}
         ON CONFLICT (id) DO UPDATE SET
           "filledQty" = EXCLUDED."filledQty",
           status = EXCLUDED.status,
           "averagePrice" = EXCLUDED."averagePrice"`,
		values,
	);
}

async function insertFills(fills: StreamFill[]) {
	const values: unknown[] = [];
	const rows = fills.map((fill, i) => {
		const b = i * 10;
		values.push(
			fill.fillId,
			fill.symbol,
			BigInt(fill.price),
			BigInt(fill.qty),
			fill.isBuyerMaker ? "SELL" : "BUY",
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
		`INSERT INTO "Fill" (id, symbol, price, qty, side, "buyOrderId", "sellOrderId", "buyerId", "sellerId", "createdAt")
         VALUES ${rows.join(", ")}
         ON CONFLICT (id) DO NOTHING`,
		values,
	);
}
