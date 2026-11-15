import "dotenv/config";
import { pool } from "./db";
import { cacheClient, connectRedis, disconnectRedis, streamConsumer } from "./redis";
import { config } from "./config";
import { logger } from "./logger";
import { flushCandles } from "./candle";
import { warmUpTickers } from "./ticker";
import {
	flushBatch,
	queueBalance,
	queueFill,
	queueOrder,
	queuePositionFill,
	loadServiceUserIds,
	loadPositionState,
} from "./persistence";
import { loadMarkets } from "./markets";
import {
	applyAccountBalance,
	flushAccountSnapshots,
	loadAccounts,
	markAccountDirty,
	startAccountSnapshots,
} from "./accounts";
import type { EngineEventRecord } from "./types";
import { startHealth, stopHealth } from "./health";
import {
	startPortfolioRetention,
	stopPortfolioRetention,
} from "./portfolioRetention";

const abortController = new AbortController();
const CURSOR_KEY = "worker:event:last_id";

await connectRedis().catch((err) => {
	logger.error("Redis connection error", err);
	process.exit(1);
});

await pool.query("SELECT 1").catch((err) => {
	logger.error("Database connection error", err);
	process.exit(1);
});

await loadServiceUserIds().catch((err) => {
	logger.error("Failed to load service accounts", err);
	process.exit(1);
});

await loadMarkets().catch((err) => {
	logger.error("Failed to load markets", err);
	process.exit(1);
});

await loadPositionState().catch((err) => {
	logger.error("Failed to load positions", err);
	process.exit(1);
});

await loadAccounts().catch((err) => {
	logger.error("Failed to load accounts", err);
	process.exit(1);
});

await warmUpTickers();
await startHealth();
startAccountSnapshots();
startPortfolioRetention();

logger.info("Worker started, listening for engine events");

let lastEventId = (await cacheClient.get(CURSOR_KEY)) ?? "0-0";

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

let flushPromise: Promise<void> | null = null;

function flushAndCheckpoint() {
	if (flushPromise) return flushPromise;

	flushPromise = (async () => {
		const cursor = lastEventId;

		try {
			await flushBatch();
		} catch {
			return;
		}

		try {
			await cacheClient.set(CURSOR_KEY, cursor);
		} catch (err) {
			logger.error("Failed to checkpoint stream cursor", err);
		}
	})().finally(() => {
		flushPromise = null;
	});

	return flushPromise;
}

function dispatch(record: EngineEventRecord, streamId: string) {
	switch (record.event.type) {
		case "order.created":
		case "order.filled":
		case "order.partially_filled":
		case "order.cancelled":
			queueOrder(record.event.order);
			return;
		case "fill.created":
			queuePositionFill(record.event.fill, streamId);
			queueFill(record.event.fill);
			markAccountDirty(record.event.fill.buyerId);
			markAccountDirty(record.event.fill.sellerId);
			return;
		case "balance.changed":
			queueBalance(record.id, record.event);
			applyAccountBalance(record.event);
			return;
		default:
			return;
	}
}

function wait(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function main() {
	const signal = abortController.signal;

	for (;;) {
		if (signal.aborted) break;

		try {
			const streams = await streamConsumer.xRead(
				[{ key: config.eventStream, id: lastEventId }],
				{ BLOCK: 5000, COUNT: 500 },
			);
			if (signal.aborted) break;
			if (!streams) continue;

			for (const stream of streams) {
				for (const message of stream.messages) {
					let record: EngineEventRecord;

					try {
						record = JSON.parse(message.message.data) as EngineEventRecord;
					} catch (err) {
						logger.error("Failed to parse engine event", err);
						lastEventId = message.id;
						continue;
					}

					try {
						dispatch(record, message.id);
						lastEventId = message.id;
					} catch (err) {
						logger.error("Failed to queue engine event", {
							eventId: record.id,
							type: record.type,
							error: err,
						});
					}
				}
			}
		} catch (err) {
			if (signal.aborted) break;
			logger.error("Stream read error", err);
			await wait(500);
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
	stopPortfolioRetention();
	await stopHealth();

	try {
		await flushCandles();
		await flushAndCheckpoint();
		await flushAccountSnapshots();
	} catch (err) {
		logger.error("Error during shutdown flush", err);
	}

	await disconnectRedis();
	await pool.end();

	clearTimeout(forceExit);
	logger.info("Worker shutdown complete");
	process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
