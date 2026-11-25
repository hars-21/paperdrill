export type OrderSide = "BUY" | "SELL";
export type OrderStatus = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";

export interface MakerOrder {
	id: string;
	userId: string;
	side: OrderSide;
	type: "LIMIT" | "MARKET";
	symbol: string;
	price: bigint | null;
	qty: bigint;
	filledQty: bigint;
	status: OrderStatus;
	createdAt: number;
}

export interface MakerBalance {
	available: bigint;
	locked: bigint;
}

export interface MakerFill {
	id: string;
	symbol: string;
	price: bigint;
	qty: bigint;
	buyerId: string;
	sellerId: string;
	createdAt: number;
}

export type EngineEvent =
	| {
			type: "order.created" | "order.filled" | "order.partially_filled" | "order.cancelled";
			order: MakerOrder;
	  }
	| { type: "fill.created"; fill: MakerFill }
	| {
			type: "depth.changed";
			symbol: string;
			side: "bids" | "asks";
			price: bigint;
			qty: bigint;
	  }
	| {
			type: "balance.changed";
			userId: string;
			asset: string;
			available: bigint;
			locked: bigint;
			deltaAvailable: bigint;
			deltaLocked: bigint;
			reason: string;
			referenceId: string | null;
			symbol: string | null;
			occurredAt: number;
	  };

export interface EngineEventRecord {
	id: string;
	type: EngineEvent["type"];
	version: number;
	occurredAt: number;
	event: EngineEvent;
}
