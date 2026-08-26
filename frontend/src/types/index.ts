export interface DepthLevel {
	price: string;
	qty: string;
}

export interface Depth {
	symbol: string;
	bids: DepthLevel[];
	asks: DepthLevel[];
}

export interface Balance {
	available: string | null;
	locked: string | null;
}

export interface UserBalance {
	[asset: string]: Balance;
}

export interface StreamResponse {
	bids: DepthLevel[];
	asks: DepthLevel[];
	lastUpdateId: number;
}

export type OrderBook = {
	bids: Record<string, string>;
	asks: Record<string, string>;
};

export interface OrderRecord {
	id: string;
	userId: string;
	side: "BUY" | "SELL";
	type: "LIMIT" | "MARKET";
	symbol: string;
	price: string | null;
	qty: string;
	filledQty: string;
	status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
	createdAt: string;
}

export interface Trade {
	id: string;
	price: string;
	qty: string;
	maker: boolean;
	timestamp: number;
}

export interface Market {
	id: string;
	symbol: string;
	name: string;
}

export interface Candle {
	event?: string;
	time: number;
	open: string;
	high: string;
	low: string;
	close: string;
	volume: string;
	symbol: string;
}
