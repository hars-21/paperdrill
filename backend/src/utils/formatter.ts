import { marketStore, assetPrecision } from "../store/market";
import { fromBigInt } from "./convert";

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

	const formatted = {
		...order,
		price: fmt(order.price, m.pricePrecision),
		qty: fmt(order.qty, m.qtyPrecision),
		filledQty: fmt(order.filledQty, m.qtyPrecision),
		averagePrice: fmt(order.averagePrice, m.pricePrecision),
		lockedAmount: fmt(order.lockedAmount, order.side === "BUY" ? m.pricePrecision : m.qtyPrecision),
		fills: order.fills ? (order.fills as Record<string, unknown>[]).map(formatTrade) : order.fills,
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

export function formatCancel(result: Record<string, unknown>) {
	const m = getMarket(result.symbol as string);
	return {
		...result,
		qty: fmt(result.qty, m.qtyPrecision),
		filledQty: fmt(result.filledQty, m.qtyPrecision),
		releasedFunds: fmt(result.releasedFunds, m.pricePrecision),
	};
}
