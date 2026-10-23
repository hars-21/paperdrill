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

export type BalanceChangeReason =
	| "initialized"
	| "deposited"
	| "credited"
	| "order.locked"
	| "order.released"
	| "fill.settled";

export interface BalanceHistoryEntry {
	id: string;
	asset: string;
	available: string;
	locked: string;
	total: string;
	deltaAvailable: string;
	deltaLocked: string;
	deltaTotal: string;
	reason: BalanceChangeReason;
	referenceId: string | null;
	symbol: string | null;
	occurredAt: string;
}

export interface BalanceHistoryAsset {
	asset: string;
	available: string;
	locked: string;
	total: string;
	netChange: string;
	entryCount: number;
	lastChangedAt: string | null;
}

export interface BalanceHistoryResponse {
	entries: BalanceHistoryEntry[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	assets: BalanceHistoryAsset[];
	filtered: {
		entryCount: number;
		netChange: string | null;
	};
}

export type BalanceHistoryRange = "24h" | "7d" | "30d" | "90d" | "all";

export interface BalanceSeriesPoint {
	at: string;
	available: string;
	locked: string;
	total: string;
}

export interface BalanceSeriesResponse {
	mode: "asset" | "total";
	asset: string | null;
	unit: string;
	precision: number;
	partial: boolean;
	range: BalanceHistoryRange;
	from: string;
	to: string;
	points: BalanceSeriesPoint[];
	current: {
		available: string;
		locked: string;
		total: string;
	} | null;
	change: string;
}

export interface DailyCredit {
	credited: boolean;
	asset: string;
	amount: string;
	creditDate: string;
	nextEligibleAt: string;
}

export interface PortfolioPosition {
	asset: string;
	available: string;
	locked: string;
	total: string;
	markPrice: string;
	value: string;
}

export interface Portfolio {
	quoteAsset: string;
	equity: string;
	baselineEquity: string;
	pnl: string;
	pnlPercent: string;
	baselineAt: string;
	asOf: string;
	partial: boolean;
	positions: PortfolioPosition[];
}

export interface LeaderboardEntry {
	position: number;
	rank: number;
	name: string;
	avatarUrl?: string | null;
	equity: string;
	pnl: string;
	pnlPercent: string;
}

export interface LeaderboardResponse {
	asOf: string;
	quoteAsset: string;
	stale: boolean;
	entries: LeaderboardEntry[];
	pagination: {
		limit: number;
		offset: number;
		total: number;
	};
}

export type MyLeaderboardResponse =
	| {
			eligible: true;
			asOf: string;
			quoteAsset: string;
			entry: LeaderboardEntry;
	  }
	| {
			eligible: false;
			reason: "EMAIL_NOT_VERIFIED" | "NO_TRADES" | "NOT_CALCULATED";
	  };

export type ApiKeyScope = "ACCOUNT_READ" | "ORDER_READ" | "ORDER_CREATE" | "ORDER_CANCEL";

export interface ApiKeyRecord {
	id: string;
	label: string;
	scopes: ApiKeyScope[];
	lastUsedAt: string | null;
	revokedAt: string | null;
	createdAt: string;
}

export interface CreatedApiKey extends Omit<ApiKeyRecord, "lastUsedAt" | "revokedAt"> {
	key: string;
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
	averagePrice?: string | null;
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

export interface UserTrade {
	id: string;
	symbol: string;
	price: string;
	qty: string;
	side: "BUY" | "SELL";
	isMaker: boolean;
	orderId: string;
	createdAt: string;
}

export interface Market {
	id: string;
	symbol: string;
	name: string;
	baseAsset: string;
	quoteAsset: string;
	pricePrecision: number;
	qtyPrecision: number;
}

export interface Ticker {
	symbol: string;
	lastPrice: string;
	openPrice: string;
	high: string;
	low: string;
	volume: string;
	quoteVolume: string;
	priceChange: string;
	priceChangePercent: number;
	timestamp: string;
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

export interface CreateOrderInput {
	side: "BUY" | "SELL";
	type: "LIMIT" | "MARKET";
	symbol: string;
	qty: string;
	price?: string | null;
}
