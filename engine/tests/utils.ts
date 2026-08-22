import { BALANCES, ORDERBOOK, ORDERS, ARCHIVED_ORDERS, RECENT_TRADES } from "../src/store";
import { createOrderHandler } from "../src/handlers/createOrder";
import { cancelOrderHandler } from "../src/handlers/cancelOrder";

export function resetState() {
	ORDERBOOK.BTC_USD = {
		baseAsset: "BTC",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 4,
		bestBid: null,
		bestAsk: null,
		bids: new Map(),
		asks: new Map(),
	};

	BALANCES["1"] = {
		USD: { available: 1000000n, locked: 0n },
		BTC: { available: 1000000n, locked: 0n },
		SOL: { available: 1000000n, locked: 0n },
		ETH: { available: 1000000n, locked: 0n },
	};

	BALANCES["2"] = {
		USD: { available: 1000000n, locked: 0n },
		BTC: { available: 1000000n, locked: 0n },
		SOL: { available: 1000000n, locked: 0n },
		ETH: { available: 1000000n, locked: 0n },
	};

	ORDERS.clear();
	RECENT_TRADES.BTC_USD = [];
	RECENT_TRADES.SOL_USD = [];
	RECENT_TRADES.ETH_USD = [];
	ARCHIVED_ORDERS.clear();
}

export async function placeOrder(input: {
	orderId: string;
	userId: string;
	side: "BUY" | "SELL";
	type: "LIMIT" | "MARKET";
	symbol: "BTC_USD" | "ETH_USD" | "SOL_USD";
	price: bigint | null;
	qty: bigint;
}) {
	return createOrderHandler(input);
}

export async function cancelOrder(userId: string, orderId: string) {
	return cancelOrderHandler({ userId, orderId });
}
