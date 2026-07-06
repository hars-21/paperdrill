import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import cookie from "cookie";
import { logger } from "./logger";

interface TokenPayload {
	id: string;
}

export function createToken(payload: TokenPayload): string {
	return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	const cookies = cookie.parse(req.headers.cookie ?? "");
	const token = cookies.token;

	if (!token) {
		res.status(401).json({ error: "Missing auth token" });
		return;
	}

	try {
		const payload = jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
		req.userId = payload.id;
		next();
	} catch (e) {
		logger.warn("Auth token verification failed", { error: (e as Error).message });
		res.status(401).json({ error: "Invalid auth token" });
	}
}
