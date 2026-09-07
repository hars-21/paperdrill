import type { Request, Response } from "express";
import { prisma } from "../db";
import { leaderboardQuerySchema } from "../schema/leaderboard";
import { assetPrecision } from "../store/market";
import { formatLeaderboardEntry } from "../utils/formatter";
import { getUserId } from "./user";
import { LEADERBOARD_REFRESH_MS } from "../services/leaderboard";
import { logger } from "../utils/logger";
import { sendValidationError } from "../utils/validation";
import { config } from "../config";
import { isLeaderboardStale } from "../utils/leaderboard";

export async function getLeaderboard(req: Request, res: Response) {
	const parsedQuery = leaderboardQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { limit = 25, offset = 0 } = parsedQuery.data;

	try {
		const snapshot = await prisma.$transaction(
			async (transaction) => {
				const state = await transaction.leaderboardState.findUnique({ where: { id: 1 } });
				if (!state) return null;

				const [entries, total] = await Promise.all([
					transaction.leaderboardEntry.findMany({
						orderBy: { position: "asc" },
						skip: offset,
						take: limit,
						include: { user: { select: { name: true } } },
					}),
					transaction.leaderboardEntry.count(),
				]);

				return { state, entries, total };
			},
			{ isolationLevel: "RepeatableRead" },
		);

		if (!snapshot) {
			res.status(503).json({ error: "Leaderboard is being calculated" });
			return;
		}

		const { state, entries, total } = snapshot;
		const quotePrecision = assetPrecision.get(state.quoteAsset);
		if (quotePrecision == null) throw new Error(`Missing precision for ${state.quoteAsset}`);

		res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
		res.status(200).json({
			asOf: state.asOf.toISOString(),
			quoteAsset: state.quoteAsset,
			stale: isLeaderboardStale(state.asOf, Date.now(), LEADERBOARD_REFRESH_MS),
			entries: entries.map((entry) =>
				formatLeaderboardEntry(entry, entry.user.name, quotePrecision),
			),
			pagination: { limit, offset, total },
		});
	} catch (error) {
		logger.error("Failed to fetch leaderboard", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function getMyLeaderboardEntry(req: Request, res: Response) {
	const userId = getUserId(req);

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { emailVerified: true },
		});
		if (!user) {
			res
				.clearCookie("token", config.cookie)
				.status(401)
				.json({ error: "Authentication required" });
			return;
		}
		if (!user.emailVerified) {
			res.status(200).json({ eligible: false, reason: "EMAIL_NOT_VERIFIED" });
			return;
		}

		const { state, entry } = await prisma.$transaction(
			async (transaction) => ({
				state: await transaction.leaderboardState.findUnique({ where: { id: 1 } }),
				entry: await transaction.leaderboardEntry.findUnique({
					where: { userId },
					include: { user: { select: { name: true } } },
				}),
			}),
			{ isolationLevel: "RepeatableRead" },
		);

		if (!state || !entry) {
			const trade = await prisma.fill.findFirst({
				where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
				select: { id: true },
			});
			res.status(200).json({
				eligible: false,
				reason: trade ? "NOT_CALCULATED" : "NO_TRADES",
			});
			return;
		}

		const quotePrecision = assetPrecision.get(state.quoteAsset);
		if (quotePrecision == null) throw new Error(`Missing precision for ${state.quoteAsset}`);

		res.status(200).json({
			eligible: true,
			asOf: state.asOf.toISOString(),
			quoteAsset: state.quoteAsset,
			entry: formatLeaderboardEntry(entry, entry.user.name, quotePrecision),
		});
	} catch (error) {
		logger.error("Failed to fetch personal leaderboard entry", error);
		res.status(500).json({ error: "Internal server error" });
	}
}
