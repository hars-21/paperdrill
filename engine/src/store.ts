import type { Fill, InternalOrder, Market, OrderStatus, Symbol, UserBalance } from "./types/domain";

// --- In-memory state ---
/*
	BALANCES = {
		user1: {
			USD: {
				available: 0,
				locked: 0,
			},
			SOL: {
				available: 0,
				locked: 0,
			},
		},
		user2: {
			USD: {
				available: 0,
				locked: 0,
			},
			SOL: {
				available: 0,
				locked: 0,
			},
		},
	};
*/
export const BALANCES: Record<string, UserBalance> = {};

/*
	ORDERBOOK = {
		SOL_USD: {
			bids: {
				299: {
					totalQty: 10,
					orders: [
						{
							userId: "1",
							qty: 10,
							filledQty: 5,
							orderId: "10",
							createdAt: 1780151880075,
						},
					],
				},
			},
			asks: {
				300: {
					totalQty: 10,
					orders: [
						{
							userId: "1",
							qty: 20,
							filledQty: 3,
							orderId: "10",
							createdAt: 1780151880075,
						},
					],
				},
			},
		},
	};
*/
export const ORDERBOOK: Record<Symbol, Market> = {
	BTC_USD: {
		baseAsset: "BTC",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 4,
		bestBid: null,
		bestAsk: null,
		bids: new Map(),
		asks: new Map(),
	},
	SOL_USD: {
		baseAsset: "SOL",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 2,
		bestBid: null,
		bestAsk: null,
		bids: new Map(),
		asks: new Map(),
	},
	ETH_USD: {
		baseAsset: "ETH",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 3,
		bestBid: null,
		bestAsk: null,
		bids: new Map(),
		asks: new Map(),
	},
};

/*
	ORDERS = [
		{
			userId: "796f7997-a68b-4631-bc1b-2b391a4d44c2",
			type: "LIMIT",
			side: "BUY",
			symbol: "SOL_USD",
			price: 50,
			qty: 2,
			orderId: "81dbd809-d762-4d34-9a86-2fdd635f917a",
			filledQty: 0,
			status: "OPEN",
			createdAt: 1780151880075,
		},
	];
*/
export const ORDERS = new Map<string, InternalOrder>();

export const ARCHIVED_ORDERS = new Map<string, OrderStatus>();

/*
	FILLS = [
		{
			fillId: "a4c96039-ba36-4491-8530-263c1e69f02e",
			symbol: "SOL_USD",
			price: 50,
			qty: 10,
			buyOrderId: "81dbd809-d762-4d34-9a86-2fdd635f917a",
			sellOrderId: "9f592d5c-1856-4b72-9bcb-c19ef34408f9",
			isBuyerMaker: true,
			createdAt: 1782032853506,
		},
	];
*/
export const FILLS: Fill[] = [];
