import { getLastUpdateId } from "../redis/publish";
import type { InternalOrder, RestingOrder } from "../types/domain";
import { getMarket } from "./market";

export interface DepthChange {
	symbol: string;
	side: "bids" | "asks";
	price: bigint;
	qty: bigint;
}

export function recomputeBestPrice(symbol: string, side: "bids" | "asks") {
	const market = getMarket(symbol);
	const prices = [...market[side].keys()];

	if (prices.length === 0) {
		if (side === "bids") market.bestBid = null;
		else market.bestAsk = null;
		return;
	}

	if (side === "bids") {
		market.bestBid = prices.length > 0 ? prices.reduce((max, p) => (p > max ? p : max)) : null;
	} else {
		market.bestAsk = prices.length > 0 ? prices.reduce((min, p) => (p < min ? p : min)) : null;
	}
}

export function addOrderToBook(order: InternalOrder): DepthChange | null {
	const { side, type, symbol, price, qty, filledQty } = order;

	if (type === "MARKET" || !price) return null;
	if (qty <= 0 || price <= 0) throw new Error("Invalid qty or price");

	const market = getMarket(symbol);
	const marketSide = side === "BUY" ? "bids" : "asks";
	const remainingQty = qty - filledQty;
	const priceLevel = market[marketSide].get(price);

	if (priceLevel) {
		priceLevel.orders.push(order as RestingOrder);
		priceLevel.totalQty += remainingQty;
	} else {
		market[marketSide].set(price, {
			totalQty: remainingQty,
			orders: [order as RestingOrder],
		});
		if (marketSide === "bids") {
			if (market.bestBid === null || price > market.bestBid) market.bestBid = price;
		} else {
			if (market.bestAsk === null || price < market.bestAsk) market.bestAsk = price;
		}
	}

	return { symbol, side: marketSide, price, qty: priceLevel?.totalQty ?? remainingQty };
}

export function removeOrderFromBook(order: InternalOrder): DepthChange | null {
	const { id, side, type, symbol, price, qty, filledQty } = order;

	if (type === "MARKET" || !price) return null;
	if (qty <= 0 || price <= 0) throw new Error("Invalid qty or price");

	const market = getMarket(symbol);
	const marketSide = side === "BUY" ? "bids" : "asks";
	const priceLevel = market[marketSide].get(price);

	if (!priceLevel) throw new Error("Invalid price");

	priceLevel.orders = priceLevel.orders.filter(
		(restingOrder: RestingOrder) => restingOrder.id !== id,
	);
	priceLevel.totalQty -= qty - filledQty;

	if (priceLevel.orders.length === 0) {
		market[marketSide].delete(price);
		if ((marketSide === "bids" ? market.bestBid : market.bestAsk) === price) {
			recomputeBestPrice(symbol, marketSide);
		}
	}

	return { symbol, side: marketSide, price, qty: priceLevel.totalQty };
}

export async function getDepth(symbol: string) {
	const market = getMarket(symbol);

	const bids = [...market.bids.entries()]
		.map(([price, level]) => ({ price, qty: level.totalQty }))
		.sort((a, b) => (a.price > b.price ? -1 : 1))
		.map(({ price, qty }) => ({ price: price.toString(), qty: qty.toString() }));

	const asks = [...market.asks.entries()]
		.map(([price, level]) => ({ price, qty: level.totalQty }))
		.sort((a, b) => (a.price < b.price ? -1 : 1))
		.map(({ price, qty }) => ({ price: price.toString(), qty: qty.toString() }));

	return {
		symbol,
		bids,
		asks,
		lastUpdateId: await getLastUpdateId(),
		timestamp: Date.now(),
	};
}
