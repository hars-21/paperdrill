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
}
