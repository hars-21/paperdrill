import { prisma } from "../db";
import type { Request, Response } from "express";
import { sendToEngine } from "../utils/engineClient";
import { formatBalance, formatUserTrade } from "../utils/formatter";
import { logger } from "../utils/logger";
import { balanceQuerySchema, depositBodySchema, tradeHistoryQuerySchema } from "../schema/exchange";
import { sendValidationError } from "../utils/validation";

export function getUserId(req: Request): string {
	const userId = req.principal?.userId;

	if (!userId) {
		throw new Error("Missing authenticated user");
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
			res.status(400).json({ error: "User not found" });
			return;
		}

		res.status(200).json({
			userId: user.id,
			email: user.email,
			name: user.name,
		});
	} catch (e) {
		logger.error("getUserData failed", e);
		res.status(500).json({ error: "Internal server error" });
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
		res.status(500).json({ error: "Internal server error" });
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
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res
		.status(200)
		.json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
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
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res
		.status(200)
		.json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
}
