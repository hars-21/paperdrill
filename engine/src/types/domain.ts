import type z from "zod";
import type { orderPayloadSchema } from "../schema";

export type Side = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type OrderStatus = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
export type UserBalance = Record<string, Balance>;
export type CreateOrderInput = z.infer<typeof orderPayloadSchema>;

export interface Balance {
	available: bigint;
	locked: bigint;
}

export interface InternalOrder {
	id: string;
	userId: string;
	side: Side;
	type: OrderType;
	symbol: string;
	price: bigint | null;
	qty: bigint;
	filledQty: bigint;
	status: OrderStatus;
	lockedAmount: bigint | null;
	spentAmount: bigint;
	createdAt: number;
}

export interface RestingOrder {
	id: string;
	userId: string;
	side: Side;
	type: "LIMIT";
	symbol: string;
	price: bigint;
	qty: bigint;
	filledQty: bigint;
	status: OrderStatus;
	spentAmount: bigint;
	createdAt: number;
}

export interface OrderRecord {
	id: string;
	userId: string;
	side: Side;
	type: OrderType;
	symbol: string;
	price: bigint | null;
	qty: bigint;
	filledQty: bigint;
	status: OrderStatus;
	lockedAmount: bigint | null;
	spentAmount: bigint;
	fills: Fill[];
	averagePrice: bigint | null;
	createdAt: number;
}

export interface Fill {
	id: string;
	symbol: string;
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
	baseAsset: string;
	quoteAsset: string;

	pricePrecision: number;
	qtyPrecision: number;

	bestBid: bigint | null;
	bestAsk: bigint | null;

	bids: Map<bigint, PriceLevel>;
	asks: Map<bigint, PriceLevel>;
}

export interface DepthLevel {
	price: string;
	qty: string;
}

export interface Depth {
	symbol: string;
	bids: DepthLevel[];
	asks: DepthLevel[];
}
