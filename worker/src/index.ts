import "dotenv/config";
import { pool } from "./db";
import { cacheClient, connectRedis, disconnectRedis, streamConsumer } from "./redis";
import { config } from "./config";
import { logger } from "./logger";
import { flushCandles } from "./candle";
import { flushBatch, queueFill, queueOrder } from "./persistence";
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

let lastFillId = (await cacheClient.get("worker:fill:last_id")) ?? "0-0";
let lastOrderId = (await cacheClient.get("worker:order:last_id")) ?? "0-0";

const candleFlushInterval = setTimeout(
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

const batchInterval = setInterval(() => {
	void flushAndCheckpoint();
}, config.flushIntervalMs);

let flushing = false;

async function flushAndCheckpoint() {
	if (flushing) return;
	flushing = true;

	const fillCursor = lastFillId;
	const orderCursor = lastOrderId;

	try {
		await flushBatch();
	} catch {
		flushing = false;
		return;
	}

	try {
		await Promise.all([
			cacheClient.set("worker:fill:last_id", fillCursor),
			cacheClient.set("worker:order:last_id", orderCursor),
		]);
	} catch (err) {
		logger.error("Failed to checkpoint stream cursors", err);
	}

	flushing = false;
}

async function main() {
	const signal = abortController.signal;

	for (;;) {
		if (signal.aborted) break;

		try {
			const streams = await streamConsumer.xRead(
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
					queueOrder(event.order);
					lastOrderId = event.id;
				} catch (err) {
					logger.error("Failed to queue order event", err);
				}
			}

			for (const event of fillEvents) {
				try {
					queueFill(event.fill);
					lastFillId = event.id;
				} catch (err) {
					logger.error("Failed to queue fill event", err);
				}
			}
		} catch (err) {
			if (signal.aborted) break;
			logger.error("Stream read error", err);
		}
	}
}

main().catch((err) => logger.error("Worker process error", err));

async function gracefulShutdown(signal: string) {
	logger.info(`Received ${signal}, shutting down...`);

	const forceExit = setTimeout(() => {
		logger.error("Graceful shutdown timed out, forcing exit");
		process.exit(1);
	}, 10000);

	abortController.abort();
	clearTimeout(candleFlushInterval);
	clearInterval(batchInterval);

	try {
		await flushCandles();
		await flushAndCheckpoint();
	} catch (err) {
		logger.error("Error during shutdown flush", err);
	}

	await disconnectRedis();
	await pool.end();

	clearTimeout(forceExit);
	process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
