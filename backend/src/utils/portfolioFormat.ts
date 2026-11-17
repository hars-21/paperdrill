import { fromBigInt } from "./convert";
import type { PortfolioView, PortfolioViewPosition } from "../services/portfolio";

function money(value: bigint | null, precision: number) {
	return value == null ? null : fromBigInt(value, precision);
}

function percent(part: bigint | null, whole: bigint | null) {
	if (part == null || whole == null || whole === 0n) return null;
	const value = (Number(part) / Number(whole)) * 100;
	if (!Number.isFinite(value)) return null;
	return value.toFixed(2);
}

function iso(at: number | null) {
	return at == null ? null : new Date(at).toISOString();
}

function formatPosition(
	position: PortfolioViewPosition,
	equity: bigint,
	quotePrecision: number,
) {
	const precision = position.qtyPrecision;

	return {
		asset: position.asset,
		symbol: position.symbol,
		qty: money(position.qty, precision),
		available: money(position.available, precision),
		locked: money(position.locked, precision),
		total: money(position.available + position.locked, precision),
		costBasis: money(position.costBasis, quotePrecision),
		averageCost: money(position.averageCost, quotePrecision),
		markPrice: money(position.markPrice, quotePrecision),
		value: money(position.value, quotePrecision),
		realizedPnl: money(position.realizedPnl, quotePrecision),
		unrealizedPnl: money(position.unrealizedPnl, quotePrecision),
		unrealizedPnlPercent: percent(position.unrealizedPnl, position.costBasis),
		allocationPercent: percent(position.value, equity),
		lastBuyPrice: money(position.lastBuyPrice, quotePrecision),
		lastBuyQty: money(position.lastBuyQty, precision),
		lastBuyAt: iso(position.lastBuyAt),
		lastSellPrice: money(position.lastSellPrice, quotePrecision),
		lastSellQty: money(position.lastSellQty, precision),
		lastSellAt: iso(position.lastSellAt),
		tradeCount: position.tradeCount,
		partial: position.partial,
	};
}

export function formatPortfolioView(view: PortfolioView) {
	const quotePrecision = view.quotePrecision;
	const totalPnl =
		view.netContributions == null ? null : view.equity - view.netContributions;
	const totalPnlPercent = percent(totalPnl, view.netContributions);

	return {
		quoteAsset: view.quoteAsset,
		asOf: new Date(view.asOf).toISOString(),
		source: view.source,
		partial: view.partial,
		cash: money(view.cash, quotePrecision),
		positionsValue: money(view.positionsValue, quotePrecision),
		equity: money(view.equity, quotePrecision),
		costBasis: money(view.costBasis, quotePrecision),
		realizedPnl: money(view.realizedPnl, quotePrecision),
		unrealizedPnl: money(view.unrealizedPnl, quotePrecision),
		netContributions: money(view.netContributions, quotePrecision),
		totalPnl: money(totalPnl, quotePrecision),
		totalPnlPercent,
		baselineEquity: money(view.netContributions, quotePrecision),
		baselineAt: iso(view.contributionsAt),
		pnl: money(totalPnl, quotePrecision),
		pnlPercent: totalPnlPercent,
		positions: view.positions.map((position) =>
			formatPosition(position, view.equity, quotePrecision),
		),
	};
}

export { money as formatMoney, percent as formatPercent };
