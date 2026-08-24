import crypto from "crypto";
import { prisma } from "../db";
import type { Request, Response } from "express";
import { createKeySchema } from "../schema/apiKey";
import { sendValidationError } from "../utils/validation";
import { hashSecret } from "../middleware/auth";
import { API_KEY_PREFIX } from "../types/principal";
import { getUserId } from "./user";
import { logger } from "../utils/logger";

const MAX_ACTIVE_KEYS_PER_USER = 10;

export async function createKey(req: Request, res: Response) {
	const parsedBody = createKeySchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const userId = getUserId(req);
	const secret = crypto.randomBytes(32).toString("base64url");

	try {
		const activeKeys = await prisma.apiKey.count({
			where: { userId, revokedAt: null },
		});

		if (activeKeys >= MAX_ACTIVE_KEYS_PER_USER) {
			res
				.status(400)
				.json({ error: `Maximum of ${MAX_ACTIVE_KEYS_PER_USER} active API keys reached` });
			return;
		}

		const key = await prisma.apiKey.create({
			data: {
				userId,
				label: parsedBody.data.label,
				hashedSecret: hashSecret(secret),
				scopes: parsedBody.data.scopes,
			},
		});

		res.status(201).json({
			id: key.id,
			label: key.label,
			scopes: key.scopes,
			createdAt: key.createdAt,
			key: `${API_KEY_PREFIX}${key.id}.${secret}`,
		});
	} catch (e) {
		logger.error("createKey failed", e);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function listKeys(req: Request, res: Response) {
	const userId = getUserId(req);

	try {
		const keys = await prisma.apiKey.findMany({
			where: { userId },
			select: {
				id: true,
				label: true,
				scopes: true,
				lastUsedAt: true,
				revokedAt: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
		});

		res.status(200).json({ keys });
	} catch (e) {
		logger.error("listKeys failed", e);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function revokeKey(req: Request, res: Response) {
	const userId = getUserId(req);
	const { id } = req.params as { id: string };

	try {
		const result = await prisma.apiKey.updateMany({
			where: { id, userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		if (result.count === 0) {
			res.status(404).json({ error: "API key not found or already revoked" });
			return;
		}

		res.status(200).json({ success: true, message: "API key revoked" });
	} catch (e) {
		logger.error("revokeKey failed", e);
		res.status(500).json({ error: "Internal server error" });
	}
}
