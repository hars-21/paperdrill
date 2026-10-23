import type { DepthLevel, Fill, OrderRecord } from "./domain";

export type PublishEventMessage =
	| {
			event: "depth";
			symbol: string;
			asks: DepthLevel[];
			bids: DepthLevel[];
			lastUpdateId: number;
			timestamp: number;
	  }
	| {
			event: "trade";
			id: string;
			symbol: string;
			price: string;
			qty: string;
			maker: boolean;
			timestamp: number;
	  };

export interface OrderEvent {
	type: "order.created" | "order.filled" | "order.partially_filled" | "order.cancelled";
	order: OrderRecord;
}

export interface FillEvent {
	type: "fill.created";
	fill: Fill;
}

export interface DepthEvent {
	type: "depth.changed";
	symbol: string;
	side: "bids" | "asks";
	price: bigint;
	qty: bigint;
}

export type BalanceChangeReason =
	| "initialized"
	| "deposited"
	| "credited"
	| "order.locked"
	| "order.released"
	| "fill.settled";

export interface BalanceChangedEvent {
	type: "balance.changed";
	userId: string;
	asset: string;
	available: bigint;
	locked: bigint;
	deltaAvailable: bigint;
	deltaLocked: bigint;
	reason: BalanceChangeReason;
	referenceId: string | null;
	symbol: string | null;
	occurredAt: number;
}

export type EngineEvent = OrderEvent | FillEvent | DepthEvent | BalanceChangedEvent;

export const ENGINE_EVENT_VERSION = 1;

export interface EngineEventRecord {
	id: string;
	type: EngineEvent["type"];
	version: number;
	occurredAt: number;
	event: EngineEvent;
}
