import type { DepthLevel, Fill, OrderRecord, Symbol } from "./domain";

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
			id: number;
			symbol: Symbol;
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
