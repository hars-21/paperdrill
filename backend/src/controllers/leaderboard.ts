import type { Request, Response } from "express";
import { prisma } from "../db";
import {
	leaderboardMeQuerySchema,
	leaderboardQuerySchema,
} from "../schema/leaderboard";
import {
	ensureLeaderboardParticipant,
	getLeaderboardEntryForUser,
	getLeaderboardMeta,
	getLeaderboardPage,
} from "../services/leaderboard";
import { sendApiError } from "../utils/apiError";
import { formatLeaderboardEntry } from "../utils/formatter";
import { logger } from "../utils/logger";
import { sendValidationError } from "../utils/validation";
import { getUserId } from "./user";
import { config } from "../config";

export async function getLeaderboard(req: Request, res: Response) {
	const parsedQuery = leaderboardQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { limit = 25, offset = 0, range = "all" } = parsedQuery.data;

	try {
		const page = getLeaderboardPage({ range, limit, offset });

		if (!page.ready) {
			sendApiError(res, 503, "LEADERBOARD_UNAVAILABLE", "Leaderboard is being calculated");
			return;
		}

		res.setHeader("Cache-Control", "no-store");
		res.status(200).json({
			asOf: page.asOf,
			quoteAsset: page.quoteAsset,
			range,
			entries: page.entries.map((entry) =>
				formatLeaderboardEntry(
					entry.standing,
					entry.name,
					page.quotePrecision,
					entry.history,
				),
			),
			pagination: { limit, offset, total: page.total },
		});
	} catch (error) {
		logger.error("Failed to fetch leaderboard", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Leaderboard could not be loaded");
	}
}

export async function getMyLeaderboardEntry(req: Request, res: Response) {
	const parsedQuery = leaderboardMeQuerySchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const userId = getUserId(req);
	const range = parsedQuery.data.range ?? "all";

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { emailVerified: true },
		});
		if (!user) {
			res.clearCookie("token", config.cookie);
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}
		if (!user.emailVerified) {
			res.status(200).json({ eligible: false, reason: "EMAIL_NOT_VERIFIED" });
			return;
		}

		let entry = getLeaderboardEntryForUser(userId, range);

		if (!entry) {
			await ensureLeaderboardParticipant(userId);
			entry = getLeaderboardEntryForUser(userId, range);
		}

		if (!entry) {
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

		const meta = getLeaderboardMeta();

		res.status(200).json({
			eligible: true,
			asOf: meta.asOf,
			quoteAsset: meta.quoteAsset,
			range,
			entry: formatLeaderboardEntry(
				entry.standing,
				entry.name,
				meta.quotePrecision,
				entry.history,
			),
		});
	} catch (error) {
		logger.error("Failed to fetch personal leaderboard entry", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Leaderboard entry could not be loaded");
	}
}
