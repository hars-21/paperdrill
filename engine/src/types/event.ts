import type { DepthLevel, Symbol } from "./domain";

export type EventMessage =
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
