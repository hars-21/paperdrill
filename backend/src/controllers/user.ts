import { prisma } from "../db";
import type { Request, Response } from "express";
import { sendToEngine } from "../utils/engineClient";
import { formatBalance } from "../utils/formatter";
import { logger } from "../utils/logger";

export function getUserId(req: Request): string {
	if (!req.userId) {
		throw new Error("Missing authenticated user");
	}
	return req.userId;
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

// Balances
export async function getBalance(req: Request, res: Response) {
	const userId = getUserId(req);

	const engineResponse = await sendToEngine("get_user_balance", { userId });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res
		.status(200)
		.json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
}
