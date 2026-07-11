import { handleEngineRequest } from "./handler";
import type { EngineRequest, EngineResponse } from "./types/request";
import {
	cacheClient,
	connectRedis,
	disconnectRedis,
	streamConsumer,
	streamProducer,
} from "./redis/client";
import { config } from "./config";
import { logger } from "./logger";
import { bigintReplacer } from "./redis/stream";

const abortController = new AbortController();

await connectRedis()
	.then(() => logger.info(`Engine listening on Redis queue: ${config.incomingStream}`))
	.catch((err) => {
		logger.error("Redis connection error", err);
		process.exit(1);
	});

async function sendResponse(responseQueue: string, response: EngineResponse) {
	await streamProducer.lPush(responseQueue, JSON.stringify(response, bigintReplacer));
}

async function processMessages() {
	const signal = abortController.signal;
	let jobsLastId = (await cacheClient.get("engine:jobs:last_id")) ?? "0-0";

	for (;;) {
		if (signal.aborted) break;

		try {
			const streams = await streamConsumer.xRead(
				{
					key: config.incomingStream,
					id: jobsLastId,
				},
				{
					BLOCK: 5000,
				},
			);

			if (signal.aborted) break;
			if (!streams) continue;

			for (const stream of streams) {
				const responses: { queue: string; payload: EngineResponse }[] = [];

				for (const message of stream.messages) {
					let request: EngineRequest;

					try {
						request = {
							correlationId: message.message.correlationId,
							responseQueue: message.message.responseQueue,
							type: message.message.type,
							payload: JSON.parse(message.message.payload),
						};
					} catch {
						logger.error("Skipping invalid broker message");

						jobsLastId = message.id;
						await cacheClient.set("engine:jobs:last_id", message.id);
						continue;
					}

					try {
						const data = await handleEngineRequest(request);

						responses.push({
							queue: request.responseQueue,
							payload: {
								correlationId: request.correlationId,
								success: true,
								data,
							},
						});
					} catch (error) {
						responses.push({
							queue: request.responseQueue,
							payload: {
								correlationId: request.correlationId,
								success: false,
								error: error instanceof Error ? error.message : "engine_error",
							},
						});
					}

					jobsLastId = message.id;
					await cacheClient.set("engine:jobs:last_id", message.id);
				}

				for (const response of responses) {
					sendResponse(response.queue, response.payload);
				}
			}
		} catch (err) {
			if (signal.aborted) break;
			logger.error("Stream read error", err);
		}
	}
}

processMessages().catch((err) => logger.error("Engine process error", err));

async function gracefulShutdown(signal: string) {
	logger.info(`Received ${signal}, shutting down...`);

	const forceExit = setTimeout(() => {
		logger.error("Graceful shutdown timed out, forcing exit");
		process.exit(1);
	}, 10000);

	abortController.abort();
	await disconnectRedis();

	clearTimeout(forceExit);
	process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
