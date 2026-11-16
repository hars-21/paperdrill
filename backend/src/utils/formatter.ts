import { marketStore, assetPrecision } from "../store/market";
import { fromBigInt } from "./convert";
import type { LeaderboardHistoryPoint, LeaderboardStanding } from "./leaderboard";

function fmt(val: unknown, prec: number): string | number | null {
	if (val == null) return null;
	if (typeof val === "number") return val;
	return fromBigInt(typeof val === "bigint" ? val : BigInt(val as string), prec);
}

function getMarket(symbol: string) {
	const m = marketStore.get(symbol);
	if (!m) throw new Error(`Unknown market: ${symbol}`);
	return m;
}

export function formatOrder(order: Record<string, unknown>) {
	const m = getMarket(order.symbol as string);
	const createdAt = order.createdAt;

	const formatted = {
		id: order.id,
		userId: order.userId,
		symbol: order.symbol,
		side: order.side,
		type: order.type,
		status: order.status,
		price: fmt(order.price, m.pricePrecision),
		qty: fmt(order.qty, m.qtyPrecision),
		filledQty: fmt(order.filledQty, m.qtyPrecision),
		averagePrice: fmt(order.averagePrice, m.pricePrecision),
		createdAt:
			typeof createdAt === "number"
				? new Date(createdAt).toISOString()
				: createdAt instanceof Date
					? createdAt.toISOString()
					: createdAt,
	};

	return Object.fromEntries(Object.entries(formatted).filter(([, value]) => value != null));
}

export function formatOrders(orders: Record<string, unknown>[]) {
	return orders.map(formatOrder);
}

export function formatTrade(trade: Record<string, unknown>) {
	const m = getMarket(trade.symbol as string);
	return {
		...trade,
		price: fmt(trade.price, m.pricePrecision),
		qty: fmt(trade.qty, m.qtyPrecision),
	};
}

export function formatTrades(trades: Record<string, unknown>[]) {
	return trades.map(formatTrade);
}

export function formatUserTrade(trade: Record<string, unknown>, userId: string) {
	const formatted = formatTrade(trade);
	const isBuyer = trade.buyerId === userId;
	const buyerIsMaker = Boolean(trade.isBuyerMaker);
	const createdAt = trade.createdAt;
	return {
		id: trade.id,
		symbol: trade.symbol,
		price: formatted.price,
		qty: formatted.qty,
		side: isBuyer ? "BUY" : "SELL",
		isMaker: isBuyer ? buyerIsMaker : !buyerIsMaker,
		orderId: isBuyer ? trade.buyOrderId : trade.sellOrderId,
		createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
	};
}

export function formatDepth(depth: Record<string, unknown>, symbol: string) {
	const m = getMarket(symbol);
	const formatLevel = (level: { price: string; qty: string }) => ({
		price: fmt(level.price, m.pricePrecision),
		qty: fmt(level.qty, m.qtyPrecision),
	});
	return {
		...depth,
		bids: (depth.bids as { price: string; qty: string }[]).map(formatLevel),
		asks: (depth.asks as { price: string; qty: string }[]).map(formatLevel),
	};
}

export function formatTicker(ticker: Record<string, unknown>) {
	const m = getMarket(ticker.symbol as string);

	const last = ticker.lastPrice;
	const open = ticker.openPrice;

	let priceChange: string | null = null;
	let priceChangePercent: number | null = null;

	if (last != null && open != null) {
		const lastN = BigInt(last as string);
		const openN = BigInt(open as string);
		const diff = lastN - openN;
		const sign = diff < 0n ? "-" : "+";
		const abs = diff < 0n ? -diff : diff;
		priceChange = `${sign}${fromBigInt(abs, m.pricePrecision)}`;
		const lastNum = Number(lastN);
		const openNum = Number(openN);
		priceChangePercent =
			openNum !== 0 ? Math.round(((lastNum - openNum) / openNum) * 10000) / 100 : 0;
	}

	return {
		event: "ticker",
		symbol: ticker.symbol,
		lastPrice: fmt(last, m.pricePrecision),
		openPrice: fmt(open, m.pricePrecision),
		high: fmt(ticker.high, m.pricePrecision),
		low: fmt(ticker.low, m.pricePrecision),
		volume: fmt(ticker.volume, m.qtyPrecision),
		quoteVolume: fmt(ticker.quoteVolume, m.pricePrecision + m.qtyPrecision),
		priceChange,
		priceChangePercent,
		timestamp: new Date(
			ticker.timestamp == null ? Date.now() : Number(ticker.timestamp),
		).toISOString(),
	};
}

export function formatTickers(tickers: Record<string, unknown>[]) {
	return tickers.map(formatTicker);
}

export function formatCandle(candle: Record<string, unknown>) {
	const m = getMarket(candle.symbol as string);
	return {
		...candle,
		open: fmt(candle.open, m.pricePrecision),
		high: fmt(candle.high, m.pricePrecision),
		low: fmt(candle.low, m.pricePrecision),
		close: fmt(candle.close, m.pricePrecision),
		volume: fmt(candle.volume, m.qtyPrecision),
	};
}

export function formatCandles(candles: Record<string, unknown>[]) {
	return candles.map(formatCandle);
}

export function formatBalance(balance: Record<string, Record<string, unknown>>) {
	const formatted: Record<string, Record<string, string | null>> = {};
	for (const [asset, values] of Object.entries(balance)) {
		const prec = assetPrecision.get(asset) ?? 0;
		formatted[asset] = {
			available: fmt(values.available, prec) as string | null,
			locked: fmt(values.locked, prec) as string | null,
		};
	}
	return formatted;
}

export function formatBalanceHistoryEntry(entry: {
	id: string;
	asset: string;
	available: bigint;
	locked: bigint;
	deltaAvailable: bigint;
	deltaLocked: bigint;
	reason: string;
	referenceId: string | null;
	symbol: string | null;
	occurredAt: Date;
}) {
	const precision = assetPrecision.get(entry.asset) ?? 0;

	return {
		id: entry.id,
		asset: entry.asset,
		available: fmt(entry.available, precision),
		locked: fmt(entry.locked, precision),
		total: fmt(entry.available + entry.locked, precision),
		deltaAvailable: fmt(entry.deltaAvailable, precision),
		deltaLocked: fmt(entry.deltaLocked, precision),
		deltaTotal: fmt(entry.deltaAvailable + entry.deltaLocked, precision),
		reason: entry.reason,
		referenceId: entry.referenceId,
		symbol: entry.symbol,
		occurredAt: entry.occurredAt.toISOString(),
	};
}

export function formatLeaderboardEntry(
	entry: LeaderboardStanding,
	name: string,
	quotePrecision: number,
	history: LeaderboardHistoryPoint[],
) {
	return {
		userId: entry.userId,
		position: entry.position,
		rank: entry.rank,
		name,
		avatarUrl: null,
		equity: fmt(entry.equity, quotePrecision),
		netContributions: fmt(entry.netContributions, quotePrecision),
		pnl: fmt(entry.pnl, quotePrecision),
		pnlPercent: fmt(entry.returnBps, 2),
		totalPnl: fmt(entry.totalPnl, quotePrecision),
		totalPnlPercent: fmt(entry.totalReturnBps, 2),
		history: history.map((point) => ({
			at: new Date(point.at).toISOString(),
			equity: fmt(point.equity, quotePrecision),
			netContributions: fmt(point.netContributions, quotePrecision),
		})),
	};
}

export function formatCancel(result: Record<string, unknown>) {
	const m = getMarket(result.symbol as string);
	return {
		id: result.id as string,
		symbol: result.symbol,
		status: result.status,
		side: result.side,
		qty: fmt(result.qty, m.qtyPrecision),
		filledQty: fmt(result.filledQty, m.qtyPrecision),
		releasedFunds: fmt(result.releasedFunds, m.pricePrecision),
	};
}
