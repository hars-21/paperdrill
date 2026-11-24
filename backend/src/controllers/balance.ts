import type { Request, Response } from "express";
import { prisma } from "../db";
import {
	balanceHistoryQuerySchema,
	balanceHistorySeriesQuerySchema,
	balanceQuerySchema,
} from "../schema/exchange";
import { assetPrecision, marketStore, type MarketMetadata } from "../store/market";
import { fromBigInt } from "../utils/convert";
import { logger } from "../utils/logger";
import { sendValidationError } from "../utils/validation";
import { sendApiError, sendEngineError } from "../utils/apiError";
import { getReferencePrices } from "../utils/referencePrice";
import { formatBalance, formatBalanceHistoryEntry } from "../utils/formatter";
import type { ReferencePrice } from "../utils/portfolio";
import { sendToEngine } from "../utils/engineClient";
import { getUserId } from "../utils/principal";

const RANGE_MS = {
	"24h": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
	"90d": 90 * 24 * 60 * 60 * 1000,
	all: null,
} as const;

const MAX_CHART_POINTS = 120;

interface BalanceSnapshot {
	available: bigint;
	locked: bigint;
}

interface SeriesPoint extends BalanceSnapshot {
	at: number;
}

function precisionFor(asset: string) {
	return assetPrecision.get(asset) ?? 0;
}

function amount(value: bigint, asset: string) {
	return fromBigInt(value, precisionFor(asset));
}

function netChange(available: bigint | null, locked: bigint | null) {
	return (available ?? 0n) + (locked ?? 0n);
}

export async function getBalance(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedQuery = balanceQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { asset } = parsedQuery.data;
	const engineResponse = await sendToEngine("get_user_balance", { userId, asset });

	if (!engineResponse.success) {
		sendEngineError(res, engineResponse.error);
		return;
	}

	res
		.status(200)
		.json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
}

export async function getBalanceHistory(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedQuery = balanceHistoryQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { asset, reason, page = 1, limit = 20 } = parsedQuery.data;
	const where = {
		userId,
		...(asset ? { asset } : {}),
		...(reason ? { reason } : {}),
	};

	try {
		const [entries, total, filteredTotals, historyAssets, balances] = await prisma.$transaction([
			prisma.balanceHistory.findMany({
				where,
				orderBy: { occurredAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.balanceHistory.count({ where }),
			prisma.balanceHistory.aggregate({
				where,
				_sum: { deltaAvailable: true, deltaLocked: true },
			}),
			prisma.balanceHistory.groupBy({
				by: ["asset"],
				where: { userId },
				orderBy: { asset: "asc" },
				_count: { _all: true },
				_sum: { deltaAvailable: true, deltaLocked: true },
				_max: { occurredAt: true },
			}),
			prisma.balance.findMany({
				where: { userId },
				orderBy: { asset: "asc" },
			}),
		]);

		const currentByAsset = new Map(balances.map((balance) => [balance.asset, balance]));
		const historyByAsset = new Map(historyAssets.map((entry) => [entry.asset, entry]));
		const assets = [
			...new Set([...historyByAsset.keys(), ...currentByAsset.keys()]),
		]
			.map((asset) => {
				const history = historyByAsset.get(asset);
				const current = currentByAsset.get(asset);
				const precision = precisionFor(asset);
				const available = current?.available ?? 0n;
				const locked = current?.locked ?? 0n;
				const entryCount =
					history && typeof history._count === "object"
						? (history._count._all ?? 0)
						: 0;

				return {
					asset,
					available: fromBigInt(available, precision),
					locked: fromBigInt(locked, precision),
					total: fromBigInt(available + locked, precision),
					netChange: fromBigInt(
						netChange(
							history?._sum?.deltaAvailable ?? null,
							history?._sum?.deltaLocked ?? null,
						),
						precision,
					),
					entryCount,
					lastChangedAt: history?._max?.occurredAt?.toISOString() ?? null,
				};
			})
			.sort((left, right) => {
				const leftFunded = Number(left.total) !== 0 ? 0 : 1;
				const rightFunded = Number(right.total) !== 0 ? 0 : 1;
				if (leftFunded !== rightFunded) return leftFunded - rightFunded;
				return left.asset.localeCompare(right.asset);
			});

		const totalPages = Math.max(1, Math.ceil(total / limit));

		res.status(200).json({
			entries: entries.map(formatBalanceHistoryEntry),
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1,
			},
			assets,
			filtered: {
				entryCount: total,
				netChange: asset
					? amount(
							netChange(filteredTotals._sum.deltaAvailable, filteredTotals._sum.deltaLocked),
							asset,
						)
					: null,
			},
		});
	} catch (error) {
		logger.error("Failed to fetch balance history", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Balance history could not be loaded");
	}
}

export async function getBalanceHistorySeries(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedQuery = balanceHistorySeriesQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { asset, range = "30d" } = parsedQuery.data;
	const now = Date.now();
	const span = RANGE_MS[range];
	const from = span === null ? null : new Date(now - span);

	try {
		const [rows, baselineRows, currentBalances, markets, prices] = await Promise.all([
			prisma.balanceHistory.findMany({
				where: {
					userId,
					...(asset ? { asset } : {}),
					...(from ? { occurredAt: { gte: from } } : {}),
				},
				orderBy: { occurredAt: "asc" },
				select: { asset: true, available: true, locked: true, occurredAt: true },
			}),
			getBaselineRows(userId, asset, from),
			prisma.balance.findMany({
				where: { userId, ...(asset ? { asset } : {}) },
				select: { asset: true, available: true, locked: true },
			}),
			asset ? Promise.resolve([]) : Promise.resolve([...marketStore.values()]),
			asset ? Promise.resolve(new Map<string, ReferencePrice>()) : getMarketPrices(),
		]);

		const quoteAsset = markets[0]?.quoteAsset ?? "USD";
		const unit = asset ?? quoteAsset;
		const precision = asset ? precisionFor(asset) : precisionFor(quoteAsset);
		let partial = false;

		const latest = new Map<string, BalanceSnapshot>();
		for (const baseline of baselineRows) {
			latest.set(baseline.asset, {
				available: baseline.available,
				locked: baseline.locked,
			});
		}

		const points = new Map<number, SeriesPoint>();
		const start = from?.getTime() ?? rows[0]?.occurredAt.getTime() ?? now;

		if (baselineRows.length > 0) {
			const baseline = baselineRows[0];
			if (asset && baseline) {
				points.set(start, {
					at: start,
					available: baseline.available,
					locked: baseline.locked,
				});
			} else {
				const value = snapshotValue(latest, quoteAsset, markets, prices);
				partial ||= value.partial;
				points.set(start, {
					at: start,
					available: value.available,
					locked: value.locked,
				});
			}
		}

		for (const row of rows) {
			const at = row.occurredAt.getTime();

			if (!asset) {
				latest.set(row.asset, { available: row.available, locked: row.locked });
				const value = snapshotValue(latest, quoteAsset, markets, prices);
				partial ||= value.partial;
				points.set(at, {
					at,
					available: value.available,
					locked: value.locked,
				});
				continue;
			}

			points.set(at, {
				at,
				available: row.available,
				locked: row.locked,
			});
		}

		let current: BalanceSnapshot | null = null;
		if (currentBalances.length > 0) {
			if (asset) {
				const balance = currentBalances[0];
				if (balance) {
					current = { available: balance.available, locked: balance.locked };
				}
			} else {
				for (const balance of currentBalances) {
					latest.set(balance.asset, {
						available: balance.available,
						locked: balance.locked,
					});
				}
				const value = snapshotValue(latest, quoteAsset, markets, prices);
				partial ||= value.partial;
				current = { available: value.available, locked: value.locked };
			}
		}

		if (current) {
			points.set(now, { at: now, ...current });
		}

		const ordered = [...points.values()].sort((left, right) => left.at - right.at);
		const sampled = downsamplePoints(ordered);

		const first = ordered[0];
		const last = ordered[ordered.length - 1];

		res.status(200).json({
			mode: asset ? "asset" : "total",
			asset: asset ?? null,
			unit,
			precision,
			partial: asset ? false : partial,
			range,
			from: new Date(start).toISOString(),
			to: new Date(now).toISOString(),
			points: sampled.map((point) => ({
				at: new Date(point.at).toISOString(),
				available: fromBigInt(point.available, precision),
				locked: fromBigInt(point.locked, precision),
				total: fromBigInt(point.available + point.locked, precision),
			})),
			current: current
				? {
						available: fromBigInt(current.available, precision),
						locked: fromBigInt(current.locked, precision),
						total: fromBigInt(current.available + current.locked, precision),
					}
				: null,
			change:
				first && last
					? fromBigInt(
							last.available +
								last.locked -
								(first.available + first.locked),
							precision,
						)
					: "0",
		});
	} catch (error) {
		logger.error("Failed to build balance history series", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Balance chart could not be loaded");
	}
}

function downsamplePoints(points: SeriesPoint[]) {
	if (points.length <= MAX_CHART_POINTS) return points;

	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last) return points;

	const span = Math.max(1, last.at - first.at);
	const bucketMs = Math.max(1, Math.ceil(span / (MAX_CHART_POINTS - 2)));
	const buckets = new Map<number, SeriesPoint>();

	for (const point of points) {
		buckets.set(Math.floor(point.at / bucketMs), point);
	}

	const sampled = [...buckets.values()].sort((left, right) => left.at - right.at);
	if (sampled[0] !== first) sampled.unshift(first);
	if (sampled[sampled.length - 1] !== last) sampled.push(last);

	return sampled;
}

async function getBaselineRows(
	userId: string,
	asset: string | undefined,
	from: Date | null,
) {
	if (!from) return [];

	if (asset) {
		const row = await prisma.balanceHistory.findFirst({
			where: { userId, asset, occurredAt: { lt: from } },
			orderBy: { occurredAt: "desc" },
			select: { asset: true, available: true, locked: true },
		});
		return row ? [row] : [];
	}

	return prisma.balanceHistory.findMany({
		where: { userId, occurredAt: { lt: from } },
		distinct: ["asset"],
		orderBy: [{ asset: "asc" }, { occurredAt: "desc" }],
		select: { asset: true, available: true, locked: true },
	});
}

async function getMarketPrices() {
	const markets = [...marketStore.values()];
	return getReferencePrices(markets);
}

function snapshotValue(
	latest: Map<string, BalanceSnapshot>,
	quoteAsset: string,
	markets: MarketMetadata[],
	prices: Map<string, ReferencePrice>,
) {
	let available = 0n;
	let locked = 0n;
	let partial = false;

	for (const [asset, balance] of latest) {
		if (balance.available === 0n && balance.locked === 0n) continue;

		if (asset === quoteAsset) {
			available += balance.available;
			locked += balance.locked;
			continue;
		}

		const market = markets.find((entry) => entry.baseAsset === asset);
		const price = market ? prices.get(market.symbol) : null;
		if (!market || !price) {
			partial = true;
			continue;
		}

		const scale = 10n ** BigInt(market.qtyPrecision);
		available += (balance.available * price.price) / scale;
		locked += (balance.locked * price.price) / scale;
	}

	return { available, locked, partial };
}