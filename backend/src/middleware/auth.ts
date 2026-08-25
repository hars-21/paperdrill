import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import cookie from "cookie";
import crypto from "crypto";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import { API_KEY_PREFIX, type PrincipalType } from "../types/principal";
import type { Scope } from "../../generated/prisma/enums";

interface TokenPayload {
	id: string;
}

interface AccessOptions {
	types?: PrincipalType[];
	scopes?: Scope[];
}

export function createToken(payload: TokenPayload): string {
	return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: "7d" });
}

export function hashSecret(raw: string): string {
	return crypto.createHash("sha256").update(raw).digest("hex");
}

export function secretsMatch(raw: string, hash: string): boolean {
	const rawHash = Buffer.from(hashSecret(raw), "hex");
	const storedHash = Buffer.from(hash, "hex");

	if (rawHash.length !== storedHash.length || storedHash.length === 0) {
		return false;
	}

	return crypto.timingSafeEqual(rawHash, storedHash);
}

function isServiceToken(token: string): boolean {
	if (!config.auth.serviceTokenHash) return false;
	return secretsMatch(token, config.auth.serviceTokenHash);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
	const credential = req.header("x-api-key");

	if (credential) {
		if (isServiceToken(credential)) {
			const serviceEmail = req.header("x-service-email");
			const service = await prisma.user.findUnique({
				where: { type: "SERVICE", email: serviceEmail },
				select: { id: true },
			});

			if (!service) {
				res.status(401).json({ error: "Invalid service email" });
				return;
			}

			req.principal = {
				type: "service",
				userId: service.id,
				scopes: ["ORDER_READ", "ORDER_CREATE", "ORDER_CANCEL"],
			};
			next();
			return;
		}

		if (!credential.startsWith(API_KEY_PREFIX)) {
			res.status(401).json({ error: "Malformed API key" });
			return;
		}

		const token = credential.slice(API_KEY_PREFIX.length);
		const separator = token.indexOf(".");
		if (separator <= 0) {
			res.status(401).json({ error: "Malformed API key" });
			return;
		}

		const keyId = token.slice(0, separator);
		const secret = token.slice(separator + 1);
		const key = await prisma.apiKey.findUnique({ where: { id: keyId } });

		if (!key || key.revokedAt || !secretsMatch(secret, key.hashedSecret)) {
			res.status(401).json({ error: "Invalid API key" });
			return;
		}

		req.principal = {
			type: "api_key",
			userId: key.userId,
			keyId: key.id,
			scopes: key.scopes,
		};

		prisma.apiKey
			.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
			.catch((e) =>
				logger.warn("Failed to update apiKey lastUsedAt", { error: (e as Error).message }),
			);

		next();
		return;
	}

	const cookies = cookie.parse(req.headers.cookie ?? "");
	const token = cookies.token;

	if (!token) {
		next();
		return;
	}

	try {
		const payload = jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
		req.principal = { type: "session", userId: payload.id };
		next();
	} catch (e) {
		logger.warn("Auth token verification failed", { error: (e as Error).message });
		res.status(401).json({ error: "Invalid auth token" });
	}
}

export function requireAccess({ types, scopes }: AccessOptions) {
	return (req: Request, res: Response, next: NextFunction) => {
		const principal = req.principal;

		if (!principal) {
			res.status(401).json({ error: "Authentication required" });
			return;
		}

		if (types?.length && !types.includes(principal.type)) {
			res.status(403).json({ error: "You do not have permission to perform this action" });
			return;
		}

		if (scopes?.length && principal.type !== "session") {
			const authorized = scopes.every((scope) => principal.scopes?.includes(scope));

			if (!authorized) {
				res.status(403).json({ error: "You do not have permission to perform this action" });
				return;
			}
		}

		next();
	};
}
