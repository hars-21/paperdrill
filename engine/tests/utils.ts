import { BALANCES, ORDERBOOK, ORDERS } from "../src/store";

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
		USD: {
			available: 10000,
			locked: 0,
		},
		BTC: {
			available: 100,
			locked: 0,
		},
		SOL: {
			available: 100,
			locked: 0,
		},
		ETH: {
			available: 100,
			locked: 0,
		},
	};

	BALANCES["2"] = {
		USD: {
			available: 10000,
			locked: 0,
		},
		BTC: {
			available: 100,
			locked: 0,
		},
		SOL: {
			available: 100,
			locked: 0,
		},
		ETH: {
			available: 100,
			locked: 0,
		},
	};

	ORDERS.length = 0;
}
