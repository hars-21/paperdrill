import type { Response } from "express";
import type { ZodError } from "zod";
import { sendApiError } from "./apiError";

export function sendValidationError(res: Response, error: ZodError) {
	return sendApiError(
		res,
		400,
		"VALIDATION_ERROR",
		"Request validation failed",
		error.issues.map((issue) => ({
			field: issue.path.join(".") || undefined,
			message: issue.message,
		})),
	);
}
