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
