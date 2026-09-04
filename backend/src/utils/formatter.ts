import { marketStore, assetPrecision } from "../store/market";
import { fromBigInt } from "./convert";
import type { PortfolioPosition } from "./portfolio";

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
		...order,
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
		timestamp: new Date(Number(ticker.timestamp)).toISOString(),
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

export function formatPortfolio(
	portfolio: {
		quoteAsset: string;
		quotePrecision: number;
		equity: bigint;
		positions: PortfolioPosition[];
	},
	baseline: bigint,
	baselineAt: Date,
) {
	const pnl = portfolio.equity - baseline;
	const pnlPercent = baseline === 0n ? 0n : (pnl * 10000n) / baseline;
	const timestamps = portfolio.positions
		.map((position) => position.markTimestamp)
		.filter((timestamp): timestamp is number => timestamp != null);

	return {
		quoteAsset: portfolio.quoteAsset,
		equity: fmt(portfolio.equity, portfolio.quotePrecision),
		baselineEquity: fmt(baseline, portfolio.quotePrecision),
		pnl: fmt(pnl, portfolio.quotePrecision),
		pnlPercent: fmt(pnlPercent, 2),
		baselineAt: baselineAt.toISOString(),
		asOf: new Date(timestamps.length > 0 ? Math.min(...timestamps) : Date.now()).toISOString(),
		positions: portfolio.positions.map((position) => ({
			asset: position.asset,
			available: fmt(position.available, position.precision),
			locked: fmt(position.locked, position.precision),
			total: fmt(position.total, position.precision),
			markPrice: fmt(position.markPrice, portfolio.quotePrecision),
			value: fmt(position.value, portfolio.quotePrecision),
		})),
	};
}

export function formatCancel(result: Record<string, unknown>) {
	const m = getMarket(result.symbol as string);
	return {
		id: result.id as string,
		symbol: result.symbol,
		side: result.side,
		qty: fmt(result.qty, m.qtyPrecision),
		filledQty: fmt(result.filledQty, m.qtyPrecision),
		releasedFunds: fmt(result.releasedFunds, m.pricePrecision),
	};
}
