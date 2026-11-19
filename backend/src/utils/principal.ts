import type { Request } from "express";
import { ApiError } from "./apiError";

export function getUserId(req: Request): string {
	const userId = req.principal?.userId;
	if (!userId) {
		throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
	}
	return userId;
}
