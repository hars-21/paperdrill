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
	price: bigint;
	qty: bigint;
	maker: boolean;
	id: number;
	timestamp: number;
}

export interface StreamFill {
	fillId: string;
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
	orderId: string;
	userId: string;
	symbol: string;
	price: string | null;
	qty: string;
	type: "LIMIT" | "MARKET";
	side: "BUY" | "SELL";
	filledQty: string;
	status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
	lockedAmount: string;
	fills: unknown[];
	averagePrice: string | null;
	createdAt: number;
}
