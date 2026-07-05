import { BALANCES, ORDERBOOK, ORDERS } from "./store";
import type { CreateOrderInput, OrderRecord, Fill, UserBalance } from "./types/domain";

function initializeBalance(): UserBalance {
	return {
		USD: { available: 10000, locked: 0 },
		BTC: { available: 100, locked: 0 },
		SOL: { available: 100, locked: 0 },
		ETH: { available: 100, locked: 0 },
	};
}

export function getUserBalance(userId: string): UserBalance {
	if (!BALANCES[userId]) {
		BALANCES[userId] = initializeBalance();
	}

	return BALANCES[userId];
}

export function lockBalance(order: CreateOrderInput): number {
	const { userId, side, type, symbol, price, qty } = order;

	const market = ORDERBOOK[symbol];
	const userBalance = getUserBalance(userId);

	const base = userBalance[market.baseAsset];
	const quote = userBalance[market.quoteAsset];

	if (side === "BUY") {
		let lockAmount: number;

		if (type === "LIMIT") {
			if (price == null) throw new Error("LIMIT order must have price");
			lockAmount = price * qty;
		} else {
			const bestAsk = market.bestAsk;
			if (bestAsk == null) throw new Error("No liquidity");
			lockAmount = bestAsk * qty * 1.1;
		}

		if (quote.available < lockAmount) {
			throw new Error("Insufficient balance");
		}

		quote.available -= lockAmount;
		quote.locked += lockAmount;

		return lockAmount;
	} else {
		if (type === "MARKET" && market.bestBid == null) {
			throw new Error("No liquidity");
		}

		if (base.available < qty) {
			throw new Error("Insufficient balance");
		}

		base.available -= qty;
		base.locked += qty;

		return qty;
	}
}

export function settleFills(fills: Fill[]) {
	for (const fill of fills) {
		const { buyOrderId, sellOrderId, qty, price } = fill;

		const buyOrder = ORDERS.get(buyOrderId);
		const sellOrder = ORDERS.get(sellOrderId);

		if (!buyOrder || !sellOrder) throw new Error("Invalid trade");

		const symbol = buyOrder.symbol;
		const market = ORDERBOOK[symbol];

		const buyerBalance = getUserBalance(buyOrder.userId);
		const sellerBalance = getUserBalance(sellOrder.userId);

		const buyerQuote = buyerBalance[market.quoteAsset];
		const sellerQuote = sellerBalance[market.quoteAsset];

		const buyerBase = buyerBalance[market.baseAsset];
		const sellerBase = sellerBalance[market.baseAsset];

		// USD transfer
		const cost = qty * price;

		buyerQuote.locked -= cost;
		sellerQuote.available += cost;

		// Asset transfer
		sellerBase.locked -= qty;
		buyerBase.available += qty;
	}
}

export function releaseBalance(order: OrderRecord) {
	const { userId, side, symbol, qty, filledQty, fills } = order;

	const market = ORDERBOOK[symbol];
	const userBalance = getUserBalance(userId);

	const quote = userBalance[market.quoteAsset];
	const base = userBalance[market.baseAsset];

	if (side === "BUY") {
		const spent = fills.reduce((t, f) => t + f.price * f.qty, 0);
		const remaining = order.lockedAmount - spent;

		if (remaining < 0) throw new Error("Invalid remaining amount");
		if (quote.locked < remaining) throw new Error("Insufficient Locked Balance");

		quote.locked -= remaining;
		quote.available += remaining;

		return remaining;
	} else {
		const remainingQty = qty - filledQty;

		if (base.locked < remainingQty) {
			throw new Error("Insufficient Locked Balance");
		}

		base.locked -= remainingQty;
		base.available += remainingQty;

		return remainingQty;
	}
}
