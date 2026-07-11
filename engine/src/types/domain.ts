export type Side = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type Symbol = "BTC_USD" | "ETH_USD" | "SOL_USD";
export type Asset = "BTC" | "SOL" | "ETH" | "USD";
export type OrderStatus = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
export type UserBalance = Record<Asset, Balance>;

export interface Balance {
	available: bigint;
	locked: bigint;
}

export interface RestingOrder {
	orderId: string;
	userId: string;
	side: Side;
	type: "LIMIT";
	symbol: Symbol;
	price: bigint;
	qty: bigint;
	filledQty: bigint;
	status: OrderStatus;
	fills: Fill[];
	averagePrice: bigint | null;
	createdAt: number;
}

export interface OrderRecord {
	orderId: string;
	userId: string;
	side: Side;
	type: OrderType;
	symbol: Symbol;
	price: bigint | null;
	qty: bigint;
	filledQty: bigint;
	status: OrderStatus;
	lockedAmount: bigint | null;
	fills: Fill[];
	averagePrice: bigint | null;
	createdAt: number;
}

export interface Fill {
	fillId: string;
	symbol: Symbol;
	price: bigint;
	qty: bigint;
	buyOrderId: string;
	sellOrderId: string;
	buyerId: string;
	sellerId: string;
	isBuyerMaker: boolean;
	createdAt: number;
}

export interface PriceLevel {
	totalQty: bigint;
	orders: RestingOrder[];
}

export interface Market {
	baseAsset: Asset;
	quoteAsset: Asset;

	pricePrecision: number;
	qtyPrecision: number;

	bestBid: bigint | null;
	bestAsk: bigint | null;

	bids: Map<bigint, PriceLevel>;
	asks: Map<bigint, PriceLevel>;
}

export interface CreateOrderInput {
	orderId: string;
	userId: string;
	side: Side;
	type: OrderType;
	symbol: Symbol;
	price: bigint | null;
	qty: bigint;
}

export interface DepthLevel {
	price: string;
	qty: string;
}

export interface Depth {
	symbol: Symbol;
	bids: DepthLevel[];
	asks: DepthLevel[];
}
