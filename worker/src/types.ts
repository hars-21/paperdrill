export interface Candle {
	time: number;
	open: bigint;
	high: bigint;
	low: bigint;
	close: bigint;
	volume: bigint;
	symbol: string;
}

export interface Trade {
	event: "trade";
	symbol: string;
	id: string;
	price: bigint;
	qty: bigint;
	maker: boolean;
	timestamp: number;
}

export interface StreamFill {
	id: string;
	symbol: string;
	price: string;
	qty: string;
	buyOrderId: string;
	sellOrderId: string;
	buyerId: string;
	sellerId: string;
	isBuyerMaker: boolean;
	createdAt: number;
}

export interface StreamOrder {
	id: string;
	userId: string;
	symbol: string;
	price: string | null;
	qty: string;
	type: "LIMIT" | "MARKET";
	side: "BUY" | "SELL";
	filledQty: string;
	status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
	lockedAmount: string | null;
	spentAmount: string;
	fills: unknown[];
	averagePrice: string | null;
	createdAt: number;
}

export type BalanceChangeReason =
	| "initialized"
	| "deposited"
	| "credited"
	| "order.locked"
	| "order.released"
	| "fill.settled";

export interface StreamOrderEvent {
	type: "order.created" | "order.filled" | "order.partially_filled" | "order.cancelled";
	order: StreamOrder;
}

export interface StreamFillEvent {
	type: "fill.created";
	fill: StreamFill;
}

export interface StreamBalanceEvent {
	type: "balance.changed";
	userId: string;
	asset: string;
	available: string;
	locked: string;
	deltaAvailable: string;
	deltaLocked: string;
	reason: BalanceChangeReason;
	referenceId: string | null;
	symbol: string | null;
	occurredAt: number;
}

export type StreamEvent = StreamOrderEvent | StreamFillEvent | StreamBalanceEvent;

export interface EngineEventRecord {
	id: string;
	type: StreamEvent["type"];
	version: number;
	occurredAt: number;
	event: StreamEvent;
}
