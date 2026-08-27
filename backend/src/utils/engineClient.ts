import type { EngineCommandType, EngineResponse } from "../types/engine";
import { resolveEngineResponse, waitForEngineResponse } from "../store/pendingResponses";
import { activeSubscriptions } from "./websocket";
import { config } from "../config";
import { logger } from "./logger";
import { marketSubscriber, publisher, responsesubscriber } from "../redis";
import { formatCandle, formatDepth, formatTrade, formatTicker } from "./formatter";

export const engineAbortController = new AbortController();

export async function sendToEngine(
	type: EngineCommandType,
	payload: Record<string, unknown>,
): Promise<EngineResponse> {
	const correlationId = crypto.randomUUID();
	const responsePromise = waitForEngineResponse(correlationId, config.engine.timeout);

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
				strategy: "MINID",
				strategyModifier: "=",
				threshold: Date.now() - config.redis.retentionMs,
			},
		},
	);

	return responsePromise;
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
		["depth:*", "trade:*", "candle:*", "ticker:*"],
		(message, channel) => {
			try {
				const parsedData = JSON.parse(message);

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
				logger.error("Invalid depth message", err);
			}
		},
	);
}
