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

export type StreamEventMessage =
	| {
			event: "order";
			order: OrderRecord;
	  }
	| {
			event: "fill";
			fill: Fill;
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

export type EngineEvent = OrderEvent | FillEvent | DepthEvent;
