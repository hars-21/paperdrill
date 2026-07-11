import "dotenv/config";
import { pool } from "./db";
import { connectRedis, disconnectRedis, streamReader } from "./redis";
import { logger } from "./logger";
import { flushCandles } from "./candle";
import { handleFill, handleOrder } from "./persistence";
import type { StreamFill, StreamOrder } from "./types";

const abortController = new AbortController();

await connectRedis().catch((err) => {
	logger.error("Redis connection error", err);
	process.exit(1);
});

await pool.query("SELECT 1").catch((err) => {
	logger.error("Database connection error", err);
	process.exit(1);
});

logger.info("Worker started, listening for stream events");

let lastFillId = (await streamReader.get("worker:fill:last_id")) ?? "0-0";
let lastOrderId = (await streamReader.get("worker:order:last_id")) ?? "0-0";

const flushInterval = setTimeout(
	() => {
		const id = setInterval(async () => {
			if (abortController.signal.aborted) {
				clearInterval(id);
				return;
			}

			try {
				await flushCandles();
			} catch (err) {
				logger.error("Flush error", err);
			}
		}, 60000);
	},
	60000 - (Date.now() % 60000),
);

processMessages().catch((err) => logger.error("Worker process error", err));

async function processMessages() {
	const signal = abortController.signal;

	for (;;) {
		if (signal.aborted) break;

		try {
			const streams = await streamReader.xRead(
				[
					{ key: "stream:fill", id: lastFillId },
					{ key: "stream:order", id: lastOrderId },
				],
				{ BLOCK: 5000 },
			);
			if (signal.aborted) break;
			if (!streams) continue;

			const orderEvents: { id: string; order: StreamOrder }[] = [];
			const fillEvents: { id: string; fill: StreamFill }[] = [];

			for (const stream of streams) {
				for (const message of stream.messages) {
					try {
						const raw = JSON.parse(message.message.data);

						if (stream.name === "stream:fill" && raw.event === "fill") {
							fillEvents.push({ id: message.id, fill: raw.fill });
						} else if (stream.name === "stream:order" && raw.event === "order") {
							orderEvents.push({ id: message.id, order: raw.order });
						}
					} catch (err) {
						logger.error("Failed to parse stream message", err);
					}
				}
			}

			for (const event of orderEvents) {
				try {
					await handleOrder(event.order);
					lastOrderId = event.id;
					await streamReader.set("worker:order:last_id", event.id);
				} catch (err) {
					logger.error("Failed to process order event", err);
				}
			}

			for (const event of fillEvents) {
				try {
					await handleFill(event.fill);
					lastFillId = event.id;
					await streamReader.set("worker:fill:last_id", event.id);
				} catch (err) {
					logger.error("Failed to process fill event", err);
				}
			}
		} catch (err) {
			if (signal.aborted) break;
			logger.error("Stream read error", err);
		}
	}
}

async function gracefulShutdown(signal: string) {
	logger.info(`Received ${signal}, shutting down...`);

	const forceExit = setTimeout(() => {
		logger.error("Graceful shutdown timed out, forcing exit");
		process.exit(1);
	}, 10000);

	abortController.abort();
	clearTimeout(flushInterval);

	await flushCandles();
	await disconnectRedis();
	await pool.end();

	clearTimeout(forceExit);
	process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
