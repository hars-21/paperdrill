import { prisma } from "../db";
import type { Request, Response } from "express";
import { sendToEngine } from "../utils/engineClient";
import { formatBalance, formatPortfolio, formatUserTrade } from "../utils/formatter";
import { logger } from "../utils/logger";
import { balanceQuerySchema, depositBodySchema, tradeHistoryQuerySchema } from "../schema/exchange";
import { sendValidationError } from "../utils/validation";
import { marketStore } from "../store/market";
import { calculatePortfolio, type Balance } from "../utils/portfolio";
import { getReferencePrices } from "../utils/referencePrice";
import { config } from "../config";
import { ApiError, sendApiError, sendEngineError } from "../utils/apiError";
import { claimDailyCredit } from "../services/dailyCredit";

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

// Balances
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

export async function getPortfolio(req: Request, res: Response) {
	const userId = getUserId(req);
	const engineResponse = await sendToEngine("get_user_balance", { userId });

	if (!engineResponse.success) {
		sendEngineError(res, engineResponse.error);
		return;
	}

	try {
		const balances = engineResponse.data as Record<string, Balance>;

		for (const [key, value] of Object.entries(balances)) {
			balances[key] = {
				available: BigInt(value.available.toString()),
				locked: BigInt(value.locked.toString()),
			};
		}

		const markets = [...marketStore.values()];
		const prices = await getReferencePrices(markets);
		const portfolio = calculatePortfolio(balances, markets, prices);
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { pnlBaseline: true, pnlBaselineAt: true },
		});

		if (!user) {
			sendApiError(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
			return;
		}

		if (user.pnlBaseline == null || user.pnlBaselineAt == null) {
			logger.warn("Portfolio requested for user without a baseline", { userId });
			sendApiError(res, 503, "PORTFOLIO_UNAVAILABLE", "Portfolio baseline is not configured");
			return;
		}

		res.status(200).json(formatPortfolio(portfolio, user.pnlBaseline, user.pnlBaselineAt));
	} catch (error) {
		logger.error("Failed to calculate portfolio", error);
		sendApiError(
			res,
			503,
			"PORTFOLIO_UNAVAILABLE",
			"Portfolio valuation is temporarily unavailable",
		);
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
