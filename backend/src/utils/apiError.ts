import type { Response } from "express";

export interface ApiErrorDetail {
	field?: string;
	message: string;
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
		public readonly details?: ApiErrorDetail[],
	) {
		super(message);
		this.name = "ApiError";
	}
}

export function sendApiError(
	res: Response,
	status: number,
	code: string,
	message: string,
	details?: ApiErrorDetail[],
) {
	const requestId = res.req?.requestId ?? crypto.randomUUID();
	return res.status(status).json({
		error: {
			code,
			message,
			...(details?.length ? { details } : {}),
		},
		requestId,
	});
}

export function engineApiError(message = "The matching engine rejected the request") {
	if (message.startsWith("Unknown market:")) {
		return new ApiError(404, "MARKET_NOT_FOUND", message);
	}
	if (message.startsWith("Unknown asset:")) {
		return new ApiError(404, "ASSET_NOT_FOUND", message);
	}
	if (message === "Order not found") {
		return new ApiError(404, "ORDER_NOT_FOUND", message);
	}
	if (message === "Filled orders cannot be cancelled") {
		return new ApiError(409, "ORDER_NOT_CANCELLABLE", message);
	}
	if (message === "Insufficient balance" || message.startsWith("Missing balance for asset:")) {
		return new ApiError(422, "INSUFFICIENT_BALANCE", message);
	}
	if (message === "No liquidity") {
		return new ApiError(422, "NO_LIQUIDITY", message);
	}

	return new ApiError(422, "ORDER_REJECTED", message);
}

export function sendEngineError(res: Response, message?: string) {
	const error = engineApiError(message);
	return sendApiError(res, error.status, error.code, error.message, error.details);
}
