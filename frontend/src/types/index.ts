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

export type PortfolioSource = "live" | "projection" | "engine";

export interface PortfolioPosition {
	asset: string;
	symbol: string | null;
	qty: string;
	available: string;
	locked: string;
	total: string;
	costBasis: string | null;
	averageCost: string | null;
	markPrice: string | null;
	value: string;
	realizedPnl: string | null;
	unrealizedPnl: string | null;
	unrealizedPnlPercent: string | null;
	allocationPercent: string | null;
	lastBuyPrice: string | null;
	lastBuyQty: string | null;
	lastBuyAt: string | null;
	lastSellPrice: string | null;
	lastSellQty: string | null;
	lastSellAt: string | null;
	tradeCount: number | null;
	partial: boolean;
}

export interface Portfolio {
	quoteAsset: string;
	asOf: string;
	source: PortfolioSource;
	partial: boolean;
	cash: string;
	positionsValue: string;
	equity: string;
	costBasis: string | null;
	realizedPnl: string | null;
	unrealizedPnl: string | null;
	netContributions: string | null;
	totalPnl: string | null;
	totalPnlPercent: string | null;
	baselineEquity: string | null;
	baselineAt: string | null;
	pnl: string | null;
	pnlPercent: string | null;
	positions: PortfolioPosition[];
}

export type PortfolioHistoryRange = "24h" | "7d" | "30d" | "90d" | "all";

export interface PortfolioHistoryPoint {
	at: string;
	cash: string;
	positionsValue: string;
	equity: string;
	realizedPnl: string;
	unrealizedPnl: string;
	netContributions: string;
	totalPnl: string;
	partial: boolean;
}

export interface PortfolioHistoryResponse {
	quoteAsset: string;
	range: PortfolioHistoryRange;
	from: string;
	to: string;
	points: PortfolioHistoryPoint[];
}

export interface PortfolioAllocationEntry {
	asset: string;
	symbol: string | null;
	value: string;
	percent: string | null;
}

export interface PortfolioPerformanceEntry {
	asset: string;
	symbol: string | null;
	costBasis: string | null;
	realizedPnl: string | null;
	unrealizedPnl: string | null;
	totalPnl: string | null;
	totalPnlPercent: string | null;
	tradeCount: number | null;
	open: boolean;
}

export interface PortfolioAnalytics {
	quoteAsset: string;
	asOf: string;
	source: PortfolioSource;
	partial: boolean;
	equity: string;
	cash: string;
	positionsValue: string;
	costBasis: string | null;
	realizedPnl: string | null;
	unrealizedPnl: string | null;
	netContributions: string | null;
	totalPnl: string | null;
	totalPnlPercent: string | null;
	allocation: PortfolioAllocationEntry[];
	cashAllocationPercent: string | null;
	performance: PortfolioPerformanceEntry[];
	bestAsset: PortfolioPerformanceEntry | null;
	worstAsset: PortfolioPerformanceEntry | null;
	trading: {
		events: number;
		buys: number;
		sells: number;
		winningSells: number;
		losingSells: number;
		winRate: string | null;
		realizedPnl: string | null;
		firstTradeAt: string | null;
		lastTradeAt: string | null;
	};
	change24h: {
		from: string;
		change: string | null;
		changePercent: string | null;
	} | null;
}

export interface PortfolioPositionDetail {
	asset: string;
	symbol: string | null;
	quoteAsset: string;
	asOf: string;
	source: PortfolioSource;
	partial: boolean;
	position: PortfolioPosition;
	portfolio: {
		cash: string;
		positionsValue: string;
		equity: string;
	};
	trading: {
		fills: number;
		buys: number;
		sells: number;
		realizedPnl: string | null;
		firstTradeAt: string | null;
		lastTradeAt: string | null;
	};
}

export interface PortfolioPositionEvent {
	id: string;
	fillId: string;
	symbol: string;
	side: "BUY" | "SELL";
	price: string;
	qty: string;
	quoteAmount: string;
	costBasisBefore: string;
	costBasisAfter: string;
	realizedPnl: string;
	occurredAt: string;
}

export interface PortfolioPositionEventsResponse {
	asset: string;
	quoteAsset: string;
	events: PortfolioPositionEvent[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export type LeaderboardRange = "24h" | "7d" | "30d" | "all";

export interface LeaderboardHistoryPoint {
	at: string;
	equity: string;
	netContributions: string;
}

export interface LeaderboardEntry {
	userId: string;
	position: number;
	rank: number;
	name: string;
	avatarUrl?: string | null;
	equity: string;
	netContributions: string;
	pnl: string;
	pnlPercent: string;
	totalPnl: string;
	totalPnlPercent: string;
	history: LeaderboardHistoryPoint[];
}

export interface LeaderboardResponse {
	asOf: string;
	quoteAsset: string;
	range: LeaderboardRange;
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
			range: LeaderboardRange;
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
