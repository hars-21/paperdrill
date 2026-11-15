import type { Request, Response } from "express";
import { prisma } from "../db";
import {
	portfolioHistoryQuerySchema,
	positionAssetParamSchema,
	positionEventQuerySchema,
} from "../schema/portfolio";
import { loadPortfolioView, quoteContext } from "../services/portfolio";
import { marketStore } from "../store/market";
import { sendApiError } from "../utils/apiError";
import { fromBigInt } from "../utils/convert";
import { logger } from "../utils/logger";
import {
	formatMoney,
	formatPercent,
	formatPortfolioView,
} from "../utils/portfolioFormat";
import { sendValidationError } from "../utils/validation";
import { getUserId } from "./user";

const RANGE_MS = {
	"24h": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
	"90d": 90 * 24 * 60 * 60 * 1000,
	all: null,
} as const;

const MAX_CHART_POINTS = 120;

interface HistoryPoint {
	at: number;
	cash: bigint;
	positionsValue: bigint;
	equity: bigint;
	realizedPnl: bigint;
	unrealizedPnl: bigint;
	netContributions: bigint;
	partial: boolean;
}

function quote() {
	return quoteContext([...marketStore.values()]);
}

function downsample<T extends { at: number }>(points: T[]) {
	if (points.length <= MAX_CHART_POINTS) return points;

	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last) return points;

	const span = Math.max(1, last.at - first.at);
	const bucketMs = Math.max(1, Math.ceil(span / (MAX_CHART_POINTS - 2)));
	const buckets = new Map<number, T>();
	for (const point of points) buckets.set(Math.floor(point.at / bucketMs), point);

	const sampled = [...buckets.values()].sort((left, right) => left.at - right.at);
	if (sampled[0] !== first) sampled.unshift(first);
	if (sampled[sampled.length - 1] !== last) sampled.push(last);

	return sampled;
}

export async function getPortfolio(req: Request, res: Response) {
	const userId = getUserId(req);

	try {
		const view = await loadPortfolioView(userId);

		if (!view) {
			sendApiError(
				res,
				503,
				"PORTFOLIO_UNAVAILABLE",
				"Portfolio valuation is temporarily unavailable",
			);
			return;
		}

		res.status(200).json(formatPortfolioView(view));
	} catch (error) {
		logger.error("Failed to load portfolio", error);
		sendApiError(
			res,
			503,
			"PORTFOLIO_UNAVAILABLE",
			"Portfolio valuation is temporarily unavailable",
		);
	}
}

export async function getPortfolioHistory(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedQuery = portfolioHistoryQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { range = "30d", limit = 2000 } = parsedQuery.data;
	const span = RANGE_MS[range];
	const from = span == null ? null : new Date(Date.now() - span);
	const { quoteAsset, quotePrecision } = quote();

	try {
		const rows = await prisma.portfolioSnapshot.findMany({
			where: {
				userId,
				...(from ? { at: { gte: from } } : {}),
			},
			orderBy: { at: "desc" },
			take: limit,
			select: {
				at: true,
				cash: true,
				positionsValue: true,
				equity: true,
				realizedPnl: true,
				unrealizedPnl: true,
				netContributions: true,
				partial: true,
			},
		});

		const ordered: HistoryPoint[] = rows
			.reverse()
			.map((row) => ({
				at: row.at.getTime(),
				cash: row.cash,
				positionsValue: row.positionsValue,
				equity: row.equity,
				realizedPnl: row.realizedPnl,
				unrealizedPnl: row.unrealizedPnl,
				netContributions: row.netContributions,
				partial: row.partial,
			}));
		const points = downsample(ordered);

		res.status(200).json({
			quoteAsset,
			range,
			from: new Date(ordered[0]?.at ?? from?.getTime() ?? Date.now()).toISOString(),
			to: new Date().toISOString(),
			points: points.map((point) => ({
				at: new Date(point.at).toISOString(),
				cash: fromBigInt(point.cash, quotePrecision),
				positionsValue: fromBigInt(point.positionsValue, quotePrecision),
				equity: fromBigInt(point.equity, quotePrecision),
				realizedPnl: fromBigInt(point.realizedPnl, quotePrecision),
				unrealizedPnl: fromBigInt(point.unrealizedPnl, quotePrecision),
				netContributions: fromBigInt(point.netContributions, quotePrecision),
				totalPnl: fromBigInt(point.equity - point.netContributions, quotePrecision),
				partial: point.partial,
			})),
		});
	} catch (error) {
		logger.error("Failed to load portfolio history", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Portfolio history could not be loaded");
	}
}

export async function getPortfolioPosition(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedParams = positionAssetParamSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	const { asset } = parsedParams.data;

	try {
		const view = await loadPortfolioView(userId);
		if (!view) {
			sendApiError(
				res,
				503,
				"PORTFOLIO_UNAVAILABLE",
				"Portfolio valuation is temporarily unavailable",
			);
			return;
		}

		const portfolio = formatPortfolioView(view);
		const position = portfolio.positions.find((item) => item.asset === asset);

		if (!position) {
			sendApiError(res, 404, "POSITION_NOT_FOUND", `No position found for ${asset}`);
			return;
		}

		const [sides, span] = await Promise.all([
			prisma.positionEvent.groupBy({
				by: ["side"],
				where: { userId, asset },
				_count: { _all: true },
				_sum: { realizedPnl: true },
			}),
			prisma.positionEvent.aggregate({
				where: { userId, asset },
				_count: true,
				_sum: { realizedPnl: true },
				_min: { occurredAt: true },
				_max: { occurredAt: true },
			}),
		]);

		const countFor = (side: string) =>
			sides.find((entry) => entry.side === side)?._count._all ?? 0;

		res.status(200).json({
			asset,
			symbol: position.symbol,
			quoteAsset: portfolio.quoteAsset,
			asOf: portfolio.asOf,
			source: portfolio.source,
			partial: portfolio.partial,
			position,
			portfolio: {
				cash: portfolio.cash,
				positionsValue: portfolio.positionsValue,
				equity: portfolio.equity,
			},
			trading: {
				fills: span._count,
				buys: countFor("BUY"),
				sells: countFor("SELL"),
				realizedPnl: formatMoney(
					span._sum.realizedPnl,
					view.quotePrecision,
				),
				firstTradeAt: span._min.occurredAt?.toISOString() ?? null,
				lastTradeAt: span._max.occurredAt?.toISOString() ?? null,
			},
		});
	} catch (error) {
		logger.error("Failed to load portfolio position", { asset, error });
		sendApiError(res, 500, "INTERNAL_ERROR", "Position could not be loaded");
	}
}

export async function getPortfolioPositionEvents(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedParams = positionAssetParamSchema.safeParse(req.params);
	const parsedQuery = positionEventQuerySchema.safeParse(req.query);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}
	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { asset } = parsedParams.data;
	const { page = 1, limit = 20 } = parsedQuery.data;
	const { quoteAsset, quotePrecision } = quote();

	try {
		const [rows, total] = await Promise.all([
			prisma.positionEvent.findMany({
				where: { userId, asset },
				orderBy: { occurredAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.positionEvent.count({ where: { userId, asset } }),
		]);

		const totalPages = Math.max(1, Math.ceil(total / limit));

		res.status(200).json({
			asset,
			quoteAsset,
			events: rows.map((row) => {
				const market = marketStore.get(row.symbol);
				const pricePrecision = market?.pricePrecision ?? quotePrecision;
				const qtyPrecision = market?.qtyPrecision ?? 0;

				return {
					id: row.id,
					fillId: row.fillId,
					symbol: row.symbol,
					side: row.side,
					price: fromBigInt(row.price, pricePrecision),
					qty: fromBigInt(row.qty, qtyPrecision),
					quoteAmount: fromBigInt(row.quoteAmount, pricePrecision),
					costBasisBefore: fromBigInt(row.costBasisBefore, quotePrecision),
					costBasisAfter: fromBigInt(row.costBasisAfter, quotePrecision),
					realizedPnl: fromBigInt(row.realizedPnl, quotePrecision),
					occurredAt: row.occurredAt.toISOString(),
				};
			}),
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1,
			},
		});
	} catch (error) {
		logger.error("Failed to load position events", { asset, error });
		sendApiError(res, 500, "INTERNAL_ERROR", "Position history could not be loaded");
	}
}

export async function getPortfolioAnalytics(req: Request, res: Response) {
	const userId = getUserId(req);

	try {
		const view = await loadPortfolioView(userId);
		if (!view) {
			sendApiError(
				res,
				503,
				"PORTFOLIO_UNAVAILABLE",
				"Portfolio valuation is temporarily unavailable",
			);
			return;
		}

		const portfolio = formatPortfolioView(view);
		const quotePrecision = view.quotePrecision;
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const [events, sides, sellStats, span, winningSells, losingSells, start] =
			await Promise.all([
				prisma.positionEvent.count({ where: { userId } }),
				prisma.positionEvent.groupBy({
					by: ["side"],
					where: { userId },
					_count: { _all: true },
				}),
				prisma.positionEvent.aggregate({
					where: { userId, side: "SELL" },
					_sum: { realizedPnl: true },
				}),
				prisma.positionEvent.aggregate({
					where: { userId },
					_min: { occurredAt: true },
					_max: { occurredAt: true },
				}),
				prisma.positionEvent.count({
					where: { userId, side: "SELL", realizedPnl: { gt: 0n } },
				}),
				prisma.positionEvent.count({
					where: { userId, side: "SELL", realizedPnl: { lt: 0n } },
				}),
				prisma.portfolioSnapshot.findFirst({
					where: { userId, at: { gte: since } },
					orderBy: { at: "asc" },
					select: { at: true, equity: true },
				}),
			]);

		const allocated = [...view.positions]
			.sort((left, right) =>
				left.value === right.value
					? left.asset.localeCompare(right.asset)
					: left.value > right.value
						? -1
						: 1,
			)
			.map((position) => ({
				asset: position.asset,
				symbol: position.symbol,
				value: formatMoney(position.value, quotePrecision),
				percent: formatPercent(position.value, view.equity),
			}));

		const performance = view.positions
			.map((position) => {
				const total =
					(position.realizedPnl ?? 0n) + (position.unrealizedPnl ?? 0n);

				return {
					asset: position.asset,
					symbol: position.symbol,
					costBasis: formatMoney(position.costBasis, quotePrecision),
					realizedPnl: formatMoney(position.realizedPnl, quotePrecision),
					unrealizedPnl: formatMoney(position.unrealizedPnl, quotePrecision),
					totalPnl: formatMoney(total, quotePrecision),
					totalPnlPercent: formatPercent(total, position.costBasis ?? 0n),
					tradeCount: position.tradeCount,
					open: position.qty > 0n,
				};
			})
			.sort((left, right) => Number(right.totalPnl ?? 0) - Number(left.totalPnl ?? 0));

		const best = performance[0] ?? null;
		const worst = performance[performance.length - 1] ?? null;
		const sells = sides.find((entry) => entry.side === "SELL")?._count._all ?? 0;
		const buys = sides.find((entry) => entry.side === "BUY")?._count._all ?? 0;
		const change = start == null ? null : view.equity - start.equity;

		res.status(200).json({
			quoteAsset: portfolio.quoteAsset,
			asOf: portfolio.asOf,
			source: portfolio.source,
			partial: portfolio.partial,
			equity: portfolio.equity,
			cash: portfolio.cash,
			positionsValue: portfolio.positionsValue,
			costBasis: portfolio.costBasis,
			realizedPnl: portfolio.realizedPnl,
			unrealizedPnl: portfolio.unrealizedPnl,
			netContributions: portfolio.netContributions,
			totalPnl: portfolio.totalPnl,
			totalPnlPercent: portfolio.totalPnlPercent,
			allocation: allocated,
			cashAllocationPercent: formatPercent(view.cash, view.equity),
			performance,
			bestAsset: best,
			worstAsset: worst,
			trading: {
				events,
				buys,
				sells,
				winningSells,
				losingSells,
				winRate:
					sells === 0 ? null : ((winningSells / sells) * 100).toFixed(2),
				realizedPnl: formatMoney(sellStats._sum.realizedPnl, quotePrecision),
				firstTradeAt: span._min.occurredAt?.toISOString() ?? null,
				lastTradeAt: span._max.occurredAt?.toISOString() ?? null,
			},
			change24h:
				start == null || change == null
					? null
					: {
							from: start.at.toISOString(),
							change: formatMoney(change, quotePrecision),
							changePercent: formatPercent(change, start.equity),
						},
		});
	} catch (error) {
		logger.error("Failed to load portfolio analytics", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Portfolio analytics could not be loaded");
	}
}
