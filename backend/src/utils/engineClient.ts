import type { EngineCommandType, EngineResponse } from "../types/engine";
import {
	rejectEngineResponse,
	resolveEngineResponse,
	waitForEngineResponse,
} from "../store/pendingResponses";
import { activeSubscriptions } from "./websocket";
import { config } from "../config";
import { logger } from "./logger";
import { marketSubscriber, publisher, responsesubscriber } from "../redis";
import { formatCandle, formatDepth, formatTrade, formatTicker } from "./formatter";
import { ApiError } from "./apiError";
import { ingestAccountSnapshot } from "../services/leaderboard";

export const engineAbortController = new AbortController();

let streamTrimTimer: ReturnType<typeof setInterval> | undefined;

export function startIncomingStreamTrim() {
	if (streamTrimTimer) return;

	streamTrimTimer = setInterval(() => {
		void Promise.all([
			publisher.xTrim(config.engine.incomingStream, "MAXLEN", config.redis.maxLen, {
				strategyModifier: "~",
				LIMIT: 10_000,
			}),
			publisher.xTrim(
				config.engine.incomingStream,
				"MINID",
				Date.now() - config.redis.retentionMs,
				{ strategyModifier: "~", LIMIT: 10_000 },
			),
		]).catch((err) => logger.error("Failed to trim incoming stream", err));
	}, config.redis.trimIntervalMs);
	streamTrimTimer.unref();
}

export function stopIncomingStreamTrim() {
	if (!streamTrimTimer) return;
	clearInterval(streamTrimTimer);
	streamTrimTimer = undefined;
}

export async function sendToEngine(
	type: EngineCommandType,
	payload: Record<string, unknown>,
): Promise<EngineResponse> {
	const correlationId = crypto.randomUUID();
	const responsePromise = waitForEngineResponse(correlationId, config.engine.timeout);

	try {
		await publisher.xAdd(
			config.engine.incomingStream,
			"*",
			{
				correlationId,
				responseQueue: config.engine.responseQueue,
				type,
				payload: JSON.stringify(payload),
			},
			{
				TRIM: {
					strategy: "MAXLEN",
					strategyModifier: "~",
					threshold: config.redis.maxLen,
				},
			},
		);

		return await responsePromise;
	} catch (error) {
		const cause = error instanceof Error ? error : new Error(String(error));
		if (cause.message === "Engine response timed out") {
			throw new ApiError(504, "ENGINE_TIMEOUT", "The matching engine did not respond in time");
		}

		rejectEngineResponse(correlationId, cause);
		void responsePromise.catch(() => undefined);
		throw new ApiError(503, "ENGINE_UNAVAILABLE", "The matching engine is unavailable");
	}
}

export async function listenForEngineresponses(): Promise<void> {
	logger.info(`Listening for engine responses on ${config.engine.responseQueue}`);
	const signal = engineAbortController.signal;

	for (;;) {
		if (signal.aborted) break;

		try {
			const response = await responsesubscriber.brPop(config.engine.responseQueue, 5);
			if (!response?.element) continue;

			const parsedResponse = JSON.parse(response.element);
			resolveEngineResponse(parsedResponse);
		} catch (err) {
			if (signal.aborted) break;
			logger.error("Engine response listener error", err);
		}
	}
}

export async function listenForOrderbookDepth(): Promise<void> {
	await marketSubscriber.pSubscribe(
		["depth:*", "trade:*", "candle:*", "ticker:*", "account:*"],
		(message, channel) => {
			try {
				const parsedData = JSON.parse(message);

				if (channel.startsWith("account:")) {
					ingestAccountSnapshot(parsedData);
				}

				let formatted: Record<string, unknown>;
				if (parsedData.event === "depth") {
					formatted = formatDepth(parsedData, parsedData.symbol);
				} else if (parsedData.event === "trade") {
					formatted = formatTrade(parsedData);
				} else if (parsedData.event === "candle") {
					formatted = formatCandle(parsedData);
				} else if (parsedData.event === "ticker") {
					formatted = formatTicker(parsedData);
				} else {
					formatted = parsedData;
				}

				activeSubscriptions[channel]?.forEach((ws) => {
					ws.send(JSON.stringify(formatted));
				});
			} catch (err) {
				logger.error("Failed to forward realtime message", err);
			}
		},
	);
}
