import { pool } from "./db";
import { publisher } from "./redis";
import { logger } from "./logger";
import type { Candle, Trade } from "./types";

const openCandles: Map<string, Candle> = new Map();

function getBucket(time: number) {
	return time - (time % 60000);
}

export function deriveData(data: Trade) {
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

export async function flushCandles() {
	const currentBucket = getBucket(Date.now());
	for (const [key, candle] of openCandles) {
		if (candle.time < currentBucket) {
			const timestamp = new Date(candle.time);

			try {
				await publisher.publish(
					`candle:${candle.symbol}`,
					JSON.stringify({ event: "candle", ...candle }, (_, v) =>
						typeof v === "bigint" ? v.toString() : v,
					),
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
