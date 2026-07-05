import { publishEvent } from "./redis/publish";
import { ORDERBOOK } from "./store";
import { logger } from "./logger";
import type { Depth, OrderRecord, RestingOrder, Symbol } from "./types/domain";
import type { EventMessage } from "./types/event";

let LastUpdateID = 1;
let LastFillID = 1;

export function addOrderToBook(order: OrderRecord) {
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
	publishDepth({
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
		market.bestBid = Math.max(...prices);
	} else {
		market.bestAsk = Math.min(...prices);
	}
}

export function removeOrderFromBook(order: OrderRecord) {
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

	publishDepth({
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

export function getDepth(symbol: Symbol) {
	const market = ORDERBOOK[symbol];

	if (!market) {
		throw new Error("Invalid symbol");
	}

	const bids = [...market.bids.entries()].map(([price, level]) => ({
		price,
		qty: level.totalQty,
	}));
	bids.sort((a, b) => b.price - a.price);

	const asks = [...market.asks.entries()].map(([price, level]) => ({
		price,
		qty: level.totalQty,
	}));
	asks.sort((a, b) => a.price - b.price);

	return {
		symbol,
		bids,
		asks,
		lastUpdateId: LastUpdateID,
		timestamp: Date.now(),
	};
}

export function publishDepth({
	symbol,
	price,
	qty,
	side,
}: {
	symbol: Symbol;
	price: number;
	qty: number;
	side: "bids" | "asks";
}) {
	const depth: Depth = {
		symbol,
		bids: [],
		asks: [],
	};

	depth[side].push({ price, qty });

	const message: EventMessage = {
		event: "depth",
		lastUpdateId: LastUpdateID++,
		timestamp: Date.now(),
		...depth,
	};

	publishEvent(message).catch((err) => {
		logger.error("Failed to publish depth", err);
	});
}

export function publishFill({
	symbol,
	price,
	qty,
	maker,
	timestamp,
}: {
	symbol: string;
	price: number;
	qty: number;
	maker: boolean;
	timestamp: number;
}) {
	const message: EventMessage = {
		event: "trade",
		symbol,
		price,
		qty,
		maker,
		id: LastFillID++,
		timestamp,
	};

	publishEvent(message).catch((err) => {
		logger.error("Failed to publish trade", err);
	});
}
