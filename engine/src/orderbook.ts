import { publishEvent } from "./redis/publish";
import { ORDERBOOK } from "./store";
import { logger } from "./logger";
import type { Depth, OrderRecord, PriceLevel, RestingOrder, Symbol } from "./types/domain";
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

	const marketside = side === "BUY" ? "bids" : "asks";
	const priceLevel = ORDERBOOK[symbol]![marketside][price];
	const remainingQty = qty - filledQty;

	if (priceLevel) {
		priceLevel.orders.push(order as RestingOrder);
		priceLevel.totalQty += remainingQty;
	} else {
		const market = ORDERBOOK[symbol]!;
		market[marketside][price] = {
			totalQty: remainingQty,
			orders: [order as RestingOrder],
		};
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
	const levels = market[side];
	const prices = Object.keys(levels).map(Number);

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

	const marketside = side === "BUY" ? "bids" : "asks";
	const priceLevel = ORDERBOOK[symbol]![marketside][price];

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
		delete ORDERBOOK[symbol]![marketside][price];
		const market = ORDERBOOK[symbol]!;
		if ((marketside === "bids" ? market.bestBid : market.bestAsk) === price) {
			recomputeBestPrice(symbol, marketside);
		}
	}
}

export function getDepth(symbol: string) {
	const orderbook = ORDERBOOK[symbol];

	if (!orderbook) {
		throw new Error("Invalid symbol");
	}

	const bids: Record<string, PriceLevel> = orderbook.bids;

	const bidsArr = Object.entries(bids).map(([price, level]) => ({
		price: Number(price),
		qty: level.totalQty,
	}));
	bidsArr.sort((a, b) => b.price - a.price);

	const asks: Record<string, PriceLevel> = orderbook.asks;

	const asksArr = Object.entries(asks).map(([price, level]) => ({
		price: Number(price),
		qty: level.totalQty,
	}));
	asksArr.sort((a, b) => a.price - b.price);

	return {
		symbol,
		bids: bidsArr,
		asks: asksArr,
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
