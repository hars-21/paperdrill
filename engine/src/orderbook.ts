import { getLastUpdateId, publishDepth } from "./redis/publish";
import { ORDERBOOK } from "./store";
import type { OrderRecord, RestingOrder, Symbol } from "./types/domain";

export async function addOrderToBook(order: OrderRecord) {
	const { side, type, symbol, price, qty, filledQty } = order;

	if (type === "MARKET" || !price) {
		return;
	}

	if (qty <= 0) {
		throw new Error("Invalid qty");
	}

	if (price <= 0) {
		throw new Error("Invalid price");
	}

	const market = ORDERBOOK[symbol]!;
	const marketside = side === "BUY" ? "bids" : "asks";
	const priceLevel = market[marketside].get(price);
	const remainingQty = qty - filledQty;

	if (priceLevel) {
		priceLevel.orders.push(order as RestingOrder);
		priceLevel.totalQty += remainingQty;
	} else {
		market[marketside].set(price, {
			totalQty: remainingQty,
			orders: [order as RestingOrder],
		});
		if (marketside === "bids") {
			if (market.bestBid === null || price > market.bestBid) {
				market.bestBid = price;
			}
		} else {
			if (market.bestAsk === null || price < market.bestAsk) {
				market.bestAsk = price;
			}
		}
	}
	await publishDepth({
		symbol,
		price,
		qty: priceLevel?.totalQty ?? remainingQty,
		side: marketside,
	});
}

export function recomputeBestPrice(symbol: Symbol, side: "bids" | "asks") {
	const market = ORDERBOOK[symbol]!;
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

export async function removeOrderFromBook(order: OrderRecord) {
	const { orderId, side, type, symbol, price, qty, filledQty } = order;

	if (type === "MARKET" || !price) {
		return;
	}

	if (qty <= 0) {
		throw new Error("Invalid qty");
	}

	if (price <= 0) {
		throw new Error("Invalid price");
	}

	const market = ORDERBOOK[symbol]!;
	const marketside = side === "BUY" ? "bids" : "asks";
	const priceLevel = market[marketside].get(price);

	if (!priceLevel) {
		throw new Error("Invalid price");
	}

	priceLevel.orders = priceLevel.orders.filter(
		(restingOrder: RestingOrder) => restingOrder.orderId !== orderId,
	);
	priceLevel.totalQty -= qty - filledQty;

	await publishDepth({
		symbol,
		price,
		qty: priceLevel.totalQty,
		side: marketside,
	});

	if (priceLevel.orders.length === 0) {
		market[marketside].delete(price);
		if ((marketside === "bids" ? market.bestBid : market.bestAsk) === price) {
			recomputeBestPrice(symbol, marketside);
		}
	}
}

export async function getDepth(symbol: Symbol) {
	const market = ORDERBOOK[symbol];

	if (!market) {
		throw new Error("Invalid symbol");
	}

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
