import "dotenv/config";
import { pool } from "./db";
import { connectRedis, disconnectRedis, publisher, streamReader } from "./redis";
import { logger } from "./logger";
import type { Candle, Trade } from "./types";

const abortController = new AbortController();
const openCandles: Map<string, Candle> = new Map();

await connectRedis();
let lastID = (await streamReader.get("candle_worker_id")) ?? "0-0";

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
			const streams = await streamReader.xRead({ key: "trade", id: lastID }, { BLOCK: 5000 });
			if (signal.aborted) break;
			if (!streams) continue;

			for (const stream of streams) {
				for (const message of stream.messages) {
					const msg = message.message;

					try {
						const trade: Trade = JSON.parse(msg.data);
						deriveData(trade);
						await streamReader.set("candle_worker_id", message.id);
					} catch (err) {
						logger.error("Failed to process trade message", err);
					}

					lastID = message.id;
				}
			}
		} catch (err) {
			if (signal.aborted) break;
			logger.error("Stream read error", err);
		}
	}
}

function deriveData(data: Trade) {
	const { symbol, price, qty, timestamp } = data;

	const bucket = getBucket(timestamp);
	const currentCandle = openCandles.get(`${symbol}_${bucket}`);

	if (!currentCandle) {
		const candle: Candle = {
			time: bucket,
			open: price,
			high: price,
			low: price,
			close: price,
			volume: qty,
			symbol,
		};
		openCandles.set(`${symbol}_${bucket}`, candle);
	} else {
		currentCandle.high = price > currentCandle.high ? price : currentCandle.high;
		currentCandle.low = price < currentCandle.low ? price : currentCandle.low;
		currentCandle.close = price;
		currentCandle.volume += qty;
	}
}

function getBucket(time: number) {
	return time - (time % 60000);
}

async function flushCandles() {
	const currentBucket = getBucket(Date.now());
	for (const [key, candle] of openCandles) {
		if (candle.time < currentBucket) {
			const timestamp = new Date(candle.time);

			try {
				await publisher.publish(
					`candle:${candle.symbol}`,
					JSON.stringify({ event: "candle", ...candle }),
				);

				await pool.query(
					`INSERT INTO "Candle" (symbol, open, high, low, close, volume, time) Values ($1, $2, $3, $4, $5, $6, $7)`,
					[
						candle.symbol,
						candle.open,
						candle.high,
						candle.low,
						candle.close,
						candle.volume,
						timestamp,
					],
				);
			} catch (err) {
				logger.error("Failed to flush candle", { symbol: candle.symbol, key });
			}

			openCandles.delete(key);
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
