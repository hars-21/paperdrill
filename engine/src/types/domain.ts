export type Side = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type Symbol = "BTC_USD" | "ETH_USD" | "SOL_USD";
export type Asset = "BTC" | "SOL" | "ETH" | "USD";
export type OrderStatus = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
export type UserBalance = Record<Asset, Balance>;

export interface Balance {
	available: number;
	locked: number;
}

export interface RestingOrder {
	orderId: string;
	userId: string;
	side: Side;
	type: "LIMIT";
	symbol: Symbol;
	price: number;
	qty: number;
	filledQty: number;
	status: OrderStatus;
	fills: Fill[];
	createdAt: number;
}

export interface OrderRecord {
	orderId: string;
	userId: string;
	side: Side;
	type: OrderType;
	symbol: Symbol;
	price: number | null;
	qty: number;
	filledQty: number;
	status: OrderStatus;
	lockedAmount: number;
	fills: Fill[];
	createdAt: number;
}

export interface Fill {
	fillId: string;
	symbol: Symbol;
	price: number;
	qty: number;
	buyOrderId: string;
	sellOrderId: string;
	isBuyerMaker: boolean;
	createdAt: number;
}

export interface PriceLevel {
	totalQty: number;
	orders: RestingOrder[];
}

export interface Market {
	baseAsset: Asset;
	quoteAsset: Asset;

	pricePrecision: number;
	qtyPrecision: number;

	bestBid: number | null;
	bestAsk: number | null;

	bids: Record<string, PriceLevel>;
	asks: Record<string, PriceLevel>;
}

export interface CreateOrderInput {
	orderId: string;
	userId: string;
	side: Side;
	type: OrderType;
	symbol: Symbol;
	price: number | null;
	qty: number;
}

export interface DepthLevel {
	price: number;
	qty: number;
}

export interface Depth {
	symbol: Symbol;
	bids: DepthLevel[];
	asks: DepthLevel[];
}
