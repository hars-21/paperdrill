import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { config } from "../config";
import { ApiError, sendApiError } from "../utils/apiError";
import { logger } from "../utils/logger";

export function requestContext(req: Request, res: Response, next: NextFunction) {
	req.requestId = crypto.randomUUID();
	res.setHeader("X-Request-Id", req.requestId);
	next();
}

export function notFoundHandler(req: Request, res: Response) {
	sendApiError(res, 404, "RESOURCE_NOT_FOUND", `Route ${req.method} ${req.path} was not found`);
}

function isBodyParserError(error: unknown): error is Error & { status: number; type?: string } {
	return error instanceof Error && "status" in error && typeof error.status === "number";
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
	if (res.headersSent) {
		_next(error);
		return;
	}

	if (error instanceof ApiError) {
		sendApiError(res, error.status, error.code, error.message, error.details);
		return;
	}

	if (isBodyParserError(error) && error.type === "entity.parse.failed") {
		sendApiError(res, 400, "MALFORMED_JSON", "Request body contains invalid JSON");
		return;
	}

	if (isBodyParserError(error) && error.status === 413) {
		sendApiError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
		return;
	}

	const message = error instanceof Error ? error.message : "Unknown error";
	if (message === "Engine response timed out") {
		sendApiError(res, 504, "ENGINE_TIMEOUT", "The matching engine did not respond in time");
		return;
	}

	logger.error("Unhandled request error", {
		requestId: req.requestId,
		method: req.method,
		path: req.originalUrl,
		error: message,
	});

	const publicMessage =
		config.app.env === "production" ? "An unexpected error occurred" : message;
	sendApiError(res, 500, "INTERNAL_ERROR", publicMessage);
};
