import { ASSETS, BALANCES, ORDERBOOK, ORDERS, ARCHIVED_ORDERS, RECENT_TRADES } from "../src/store";
import { createOrderHandler } from "../src/handlers/createOrder";
import { cancelOrderHandler } from "../src/handlers/cancelOrder";

export function resetState() {
	for (const symbol of Object.keys(ORDERBOOK)) delete ORDERBOOK[symbol];
	for (const symbol of Object.keys(RECENT_TRADES)) delete RECENT_TRADES[symbol];
	for (const userId of Object.keys(BALANCES)) delete BALANCES[userId];
	ASSETS.clear();
	ASSETS.add("BTC");
	ASSETS.add("USD");

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
	};

	BALANCES["2"] = {
		USD: { available: 1000000n, locked: 0n },
		BTC: { available: 1000000n, locked: 0n },
	};

	ORDERS.clear();
	RECENT_TRADES.BTC_USD = [];
	ARCHIVED_ORDERS.clear();
}

export async function placeOrder(input: {
	id: string;
	userId: string;
	side: "BUY" | "SELL";
	type: "LIMIT" | "MARKET";
	symbol: string;
	price: bigint | null;
	qty: bigint;
}) {
	return createOrderHandler(input);
}

export async function cancelOrder(userId: string, id: string) {
	return cancelOrderHandler({ userId, id });
}
