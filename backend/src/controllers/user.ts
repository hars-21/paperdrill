import { prisma } from "../db";
import type { Request, Response } from "express";
import { sendToEngine } from "../utils/engineClient";
import { formatBalance, formatUserTrade } from "../utils/formatter";
import { logger } from "../utils/logger";
import { depositBodySchema, tradeHistoryQuerySchema } from "../schema/exchange";
import { sendValidationError } from "../utils/validation";
import { ApiError, sendApiError, sendEngineError } from "../utils/apiError";
import { config } from "../config";
import { claimDailyCredit } from "../services/dailyCredit";
import { updateEmailSchema } from "../schema/auth";
import { isEmailDeliveryEnabled, sendVerificationEmail } from "../utils/emailClient";
import { Prisma } from "../../generated/prisma/client";
import crypto from "crypto";

export function getUserId(req: Request): string {
	const userId = req.principal?.userId;

	if (!userId) {
		throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
	}

	return userId;
}

export async function getUserData(req: Request, res: Response) {
	const userId = getUserId(req);

	try {
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!user) {
			res.clearCookie("token", config.cookie);
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}

		res.status(200).json({
			id: user.id,
			email: user.email,
			name: user.name,
			emailVerified: user.emailVerified,
		});
	} catch (e) {
		logger.error("getUserData failed", e);
		sendApiError(res, 500, "INTERNAL_ERROR", "User profile could not be loaded");
	}
}

export async function updateUserEmail(req: Request, res: Response) {
	const parsedBody = updateEmailSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const userId = getUserId(req);
	const { email } = parsedBody.data;

	if (!isEmailDeliveryEnabled()) {
		sendApiError(res, 503, "SERVICE_UNAVAILABLE", "Email delivery is currently unavailable");
		return;
	}

	try {
		const user = await prisma.user.findUnique({ where: { id: userId } });

		if (!user) {
			res.clearCookie("token", config.cookie);
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}

		if (user.emailVerified) {
			sendApiError(res, 409, "EMAIL_ALREADY_VERIFIED", "Verified email cannot be changed here");
			return;
		}

		if (user.email === email) {
			sendApiError(res, 409, "EMAIL_UNCHANGED", "Enter a different email address");
			return;
		}

		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			sendApiError(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
			return;
		}

		const token = crypto.randomBytes(32).toString("hex");
		const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
		const updatedUser = await prisma.$transaction(async (tx) => {
			await tx.verificationToken.deleteMany({ where: { userId } });
			const updated = await tx.user.update({ where: { id: userId }, data: { email } });
			await tx.verificationToken.create({
				data: {
					userId,
					tokenHash,
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				},
			});
			return updated;
		});

		void sendVerificationEmail(updatedUser.name, updatedUser.email, token);

		res.status(200).json({
			id: updatedUser.id,
			name: updatedUser.name,
			email: updatedUser.email,
			emailVerified: updatedUser.emailVerified,
			message: "Email updated. Check your inbox for a new verification link.",
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			sendApiError(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
			return;
		}
		logger.error("Email update failed", error);
		sendApiError(res, 500, "INTERNAL_ERROR", "Email could not be updated");
	}
}

export async function getTradeHistory(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedQueries = tradeHistoryQuerySchema.safeParse(req.query);

	if (!parsedQueries.success) {
		sendValidationError(res, parsedQueries.error);
		return;
	}

	try {
		const { limit = 100 } = parsedQueries.data;

		const fills = await prisma.fill.findMany({
			where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		res
			.status(200)
			.json(
				fills.map((fill) => formatUserTrade(fill as unknown as Record<string, unknown>, userId)),
			);
	} catch (err) {
		logger.error("Failed to fetch trade history", err);
		sendApiError(res, 500, "INTERNAL_ERROR", "Trade history could not be loaded");
	}
}

export async function createDeposit(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedBody = depositBodySchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { amount, asset } = parsedBody.data;

	const engineResponse = await sendToEngine("create_deposit", { userId, amount, asset });

	if (!engineResponse.success) {
		sendEngineError(res, engineResponse.error);
		return;
	}

	res
		.status(200)
		.json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
}

export async function claimDailyReward(req: Request, res: Response) {
	const reward = await claimDailyCredit(getUserId(req));
	res.status(200).json(reward);
}
