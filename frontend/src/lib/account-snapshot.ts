import type { Portfolio, PortfolioPosition } from "@/types";

/**
 * The worker publishes snapshots with scaled integer strings so persistence and
 * aggregation stay lossless. The REST API already formats those values, so live
 * snapshots are converted here before they enter the same query cache.
 */
export interface RawAccountSnapshotPosition {
	asset: string;
	symbol: string | null;
	qtyPrecision: number;
	qty: string;
	available: string;
	locked: string;
	costBasis: string;
	averageCost: string | null;
	markPrice: string | null;
	value: string;
	realizedPnl: string;
	unrealizedPnl: string;
	lastBuyPrice: string | null;
	lastBuyQty: string | null;
	lastBuyAt: number | null;
	lastSellPrice: string | null;
	lastSellQty: string | null;
	lastSellAt: number | null;
	tradeCount: number;
}

export interface RawAccountSnapshot {
	userId: string;
	at: number;
	quoteAsset: string;
	quotePrecision: number;
	cash: string;
	positionsValue: string;
	equity: string;
	costBasis: string;
	realizedPnl: string;
	unrealizedPnl: string;
	netContributions: string;
	totalPnl: string;
	partial: boolean;
	positions: RawAccountSnapshotPosition[];
}

function decimal(value: string, precision: number) {
	if (precision <= 0) return value;

	const negative = value.startsWith("-");
	const digits = negative ? value.slice(1) : value;
	const padded = digits.padStart(precision + 1, "0");
	const dot = padded.length - precision;

	return `${negative ? "-" : ""}${padded.slice(0, dot)}.${padded.slice(dot)}`;
}

function money(value: string | null, precision: number) {
	return value == null ? null : decimal(value, precision);
}

function percent(part: string, whole: string) {
	const denominator = Number(whole);
	if (!Number.isFinite(denominator) || denominator === 0) return null;

	const value = (Number(part) / denominator) * 100;
	if (!Number.isFinite(value)) return null;

	return value.toFixed(2);
}

function iso(at: number | null) {
	return at == null ? null : new Date(at).toISOString();
}

function formatPosition(
	position: RawAccountSnapshotPosition,
	equity: string,
	quotePrecision: number,
): PortfolioPosition {
	const qtyPrecision = position.qtyPrecision;
	const total = (BigInt(position.available) + BigInt(position.locked)).toString();

	return {
		asset: position.asset,
		symbol: position.symbol,
		qty: decimal(position.qty, qtyPrecision),
		available: decimal(position.available, qtyPrecision),
		locked: decimal(position.locked, qtyPrecision),
		total: decimal(total, qtyPrecision),
		costBasis: decimal(position.costBasis, quotePrecision),
		averageCost: money(position.averageCost, quotePrecision),
		markPrice: money(position.markPrice, quotePrecision),
		value: decimal(position.value, quotePrecision),
		realizedPnl: decimal(position.realizedPnl, quotePrecision),
		unrealizedPnl: decimal(position.unrealizedPnl, quotePrecision),
		unrealizedPnlPercent: percent(position.unrealizedPnl, position.costBasis),
		allocationPercent: percent(position.value, equity),
		lastBuyPrice: money(position.lastBuyPrice, quotePrecision),
		lastBuyQty: money(position.lastBuyQty, qtyPrecision),
		lastBuyAt: iso(position.lastBuyAt),
		lastSellPrice: money(position.lastSellPrice, quotePrecision),
		lastSellQty: money(position.lastSellQty, qtyPrecision),
		lastSellAt: iso(position.lastSellAt),
		tradeCount: position.tradeCount,
		partial: false,
	};
}

export function formatAccountSnapshot(snapshot: RawAccountSnapshot): Portfolio {
	const quotePrecision = snapshot.quotePrecision;
	const totalPnlPercent = percent(snapshot.totalPnl, snapshot.netContributions);

	return {
		quoteAsset: snapshot.quoteAsset,
		asOf: new Date(snapshot.at).toISOString(),
		source: "live",
		partial: snapshot.partial,
		cash: decimal(snapshot.cash, quotePrecision),
		positionsValue: decimal(snapshot.positionsValue, quotePrecision),
		equity: decimal(snapshot.equity, quotePrecision),
		costBasis: decimal(snapshot.costBasis, quotePrecision),
		realizedPnl: decimal(snapshot.realizedPnl, quotePrecision),
		unrealizedPnl: decimal(snapshot.unrealizedPnl, quotePrecision),
		netContributions: decimal(snapshot.netContributions, quotePrecision),
		totalPnl: decimal(snapshot.totalPnl, quotePrecision),
		totalPnlPercent,
		baselineEquity: decimal(snapshot.netContributions, quotePrecision),
		baselineAt: null,
		pnl: decimal(snapshot.totalPnl, quotePrecision),
		pnlPercent: totalPnlPercent,
		positions: snapshot.positions.map((position) =>
			formatPosition(position, snapshot.equity, quotePrecision),
		),
	};
}
