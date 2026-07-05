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
