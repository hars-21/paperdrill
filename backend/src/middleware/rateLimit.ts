import type { Request } from "express";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { config } from "../config";
import { rateLimiterClient } from "../redis";
import { logger } from "../utils/logger";

async function sendCommand(...args: string[]): Promise<number> {
	if (!rateLimiterClient.isOpen) {
		await rateLimiterClient.connect();
	}
	return rateLimiterClient.sendCommand(args);
}

function bucketKey(req: Request): string {
	const principal = req.principal;

	if (principal?.type === "session") return `u:${principal.userId}`;
	if (principal?.type === "api_key") return `k:${principal.keyId}`;

	return `ip:${req.ip ?? "unknown"}`;
}

function createLimiter(prefix: string, windowMs: number, limit: number) {
	return rateLimit({
		windowMs,
		limit,
		keyGenerator: bucketKey,
		store: new RedisStore({ prefix, sendCommand }),
		standardHeaders: true,
		legacyHeaders: false,
		skip: (req) => !config.rateLimit.enabled || req.principal?.type === "service",
		handler: (req, res) => {
			logger.warn("Rate limit exceeded", { key: bucketKey(req), path: req.originalUrl });
			res.status(429).json({ error: "Too many requests, please try again later" });
		},
	});
}

export const apiLimiter = createLimiter(
	"rl:api:",
	config.rateLimit.api.windowMs,
	config.rateLimit.api.max,
);

export const authLimiter = createLimiter(
	"rl:auth:",
	config.rateLimit.auth.windowMs,
	config.rateLimit.auth.max,
);

export const orderLimiter = createLimiter(
	"rl:order:",
	config.rateLimit.order.windowMs,
	config.rateLimit.order.max,
);
