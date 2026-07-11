import { deriveData } from "./candle";
import { pool } from "./db";
import type { StreamFill, StreamOrder } from "./types";

export async function handleFill(fill: StreamFill) {
	deriveData({
		event: "trade",
		symbol: fill.symbol,
		price: BigInt(fill.price),
		qty: BigInt(fill.qty),
		maker: fill.isBuyerMaker,
		id: 0,
		timestamp: fill.createdAt,
	});

	await pool.query(
		`INSERT INTO "Fill" (id, symbol, price, qty, side, "buyOrderId", "sellOrderId", "buyerId", "sellerId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
		[
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
		],
	);
}

export async function handleOrder(order: StreamOrder) {
	await pool.query(
		`INSERT INTO "Order" (id, "userId", symbol, price, qty, type, side, "filledQty", status, "averagePrice", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           "filledQty" = EXCLUDED."filledQty",
           status = EXCLUDED.status,
           "averagePrice" = EXCLUDED."averagePrice"`,
		[
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
		],
	);
}
