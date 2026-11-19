import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db";
import { completeOnboardingSchema } from "../schema/onboarding";
import { depositBodySchema, tradeHistoryQuerySchema } from "../schema/exchange";
import {
	STARTER_BALANCE_AMOUNT,
	STARTER_BALANCE_ASSET,
	initializeBalance,
	starterBalanceAmount,
} from "../services/account-bootstrap";
import { claimDailyCredit } from "../services/dailyCredit";
import { ensureLeaderboardParticipant } from "../services/leaderboard";
import { sendApiError, sendEngineError } from "../utils/apiError";
import { sendToEngine } from "../utils/engineClient";
import { formatBalance, formatUserTrade } from "../utils/formatter";
import { logger } from "../utils/logger";
import { getUserId } from "../utils/principal";
import { sendValidationError } from "../utils/validation";

type ProfileUser = {
	id: string;
	email: string;
	name: string;
	username: string | null;
	emailVerified: boolean;
	pnlBaseline?: bigint | null;
};

const profileSelect = {
	id: true,
	email: true,
	name: true,
	username: true,
	emailVerified: true,
} as const;

async function hasStarterClaim(userId: string) {
	const claim = await prisma.creditClaim.findUnique({
		where: { userId_kind_periodKey: { userId, kind: "STARTER", periodKey: "" } },
		select: { id: true },
	});
	return claim !== null;
}

function toProfile(user: ProfileUser, starterClaimed: boolean) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		username: user.username,
		emailVerified: user.emailVerified,
		starterClaimed,
		needsOnboarding: !user.username || !starterClaimed,
	};
}

async function loadProfile(userId: string) {
	const [user, starterClaimed] = await Promise.all([
		prisma.user.findUnique({ where: { id: userId }, select: profileSelect }),
		hasStarterClaim(userId),
	]);

	if (!user) return null;
	return toProfile(user, starterClaimed);
}

export async function getUserData(req: Request, res: Response) {
	try {
		const profile = await loadProfile(getUserId(req));
		if (!profile) {
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}
		res.status(200).json(profile);
	} catch (error) {
		logger.error("Failed to load user profile", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "User profile could not be loaded");
	}
}

export async function completeOnboarding(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsed = completeOnboardingSchema.safeParse(req.body);
	if (!parsed.success) {
		sendValidationError(res, parsed.error);
		return;
	}

	const { name, username } = parsed.data;

	try {
		const existing = await prisma.user.findUnique({
			where: { id: userId },
			select: profileSelect,
		});
		if (!existing) {
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}
		if (existing.username && existing.username !== username) {
			sendApiError(res, 409, "USERNAME_IMMUTABLE", "Username cannot be changed");
			return;
		}

		const updated = await prisma.user.update({
			where: { id: userId },
			data: existing.username ? { name } : { name, username },
			select: profileSelect,
		});

		res.status(200).json(toProfile(updated, await hasStarterClaim(userId)));
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			sendApiError(res, 409, "USERNAME_TAKEN", "That username is already taken");
			return;
		}
		logger.error("Failed to complete onboarding", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Onboarding could not be completed");
	}
}

export async function claimStarterCredit(req: Request, res: Response) {
	const userId = getUserId(req);

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { ...profileSelect, pnlBaseline: true },
		});
		if (!user) {
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}
		if (!user.username) {
			sendApiError(res, 409, "ONBOARDING_INCOMPLETE", "Choose a username before claiming your starter balance");
			return;
		}

		let claimed = false;
		const existing = await prisma.creditClaim.findUnique({
			where: { userId_kind_periodKey: { userId, kind: "STARTER", periodKey: "" } },
			select: { id: true },
		});

		if (!existing) {
			const amount = starterBalanceAmount();
			await initializeBalance(userId, amount);

			const now = new Date();
			await prisma.$transaction(async (tx) => {
				await tx.creditClaim.create({
					data: {
						userId,
						kind: "STARTER",
						periodKey: "",
						asset: STARTER_BALANCE_ASSET,
						amount,
					},
				});

				if (user.pnlBaseline == null) {
					await tx.user.update({
						where: { id: userId },
						data: { pnlBaseline: amount, pnlBaselineAt: now },
					});
				}
			});

			claimed = true;
			void ensureLeaderboardParticipant(userId);
		}

		res.status(200).json({
			user: await loadProfile(userId),
			claimed,
			asset: STARTER_BALANCE_ASSET,
			amount: STARTER_BALANCE_AMOUNT,
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			const profile = await loadProfile(userId);
			if (profile) {
				res.status(200).json({
					user: profile,
					claimed: false,
					asset: STARTER_BALANCE_ASSET,
					amount: STARTER_BALANCE_AMOUNT,
				});
				return;
			}
		}
		logger.error("Failed to claim starter balance", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Starter balance could not be claimed");
	}
}

export async function getTradeHistory(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsed = tradeHistoryQuerySchema.safeParse(req.query);
	if (!parsed.success) {
		sendValidationError(res, parsed.error);
		return;
	}

	try {
		const { limit = 100 } = parsed.data;
		const fills = await prisma.fill.findMany({
			where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		res.status(200).json(
			fills.map((fill) => formatUserTrade(fill as unknown as Record<string, unknown>, userId)),
		);
	} catch (error) {
		logger.error("Failed to fetch trade history", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Trade history could not be loaded");
	}
}

export async function createDeposit(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsed = depositBodySchema.safeParse(req.body);
	if (!parsed.success) {
		sendValidationError(res, parsed.error);
		return;
	}

	const { amount, asset } = parsed.data;
	const engineResponse = await sendToEngine("create_deposit", { userId, amount, asset });
	if (!engineResponse.success) {
		sendEngineError(res, engineResponse.error);
		return;
	}

	res.status(200).json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
}

export async function claimDailyReward(req: Request, res: Response) {
	const reward = await claimDailyCredit(getUserId(req));
	res.status(200).json(reward);
}
