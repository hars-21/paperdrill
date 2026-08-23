import { cacheClient, publisher, streamProducer } from "./client";
import type { PublishEventMessage, StreamEventMessage } from "../types/event";
import type { Fill } from "../types/domain";
import { logger } from "../util/logger";
import { config } from "../config";
import { bigintReplacer } from "../util";

let localDepthId = 0;

async function safeIncr(key: string, fallbackFn: () => number): Promise<number> {
	try {
		if (!cacheClient.isOpen) return fallbackFn();
		return await cacheClient.incr(key);
	} catch {
		return fallbackFn();
	}
}

export async function streamEvent(message: StreamEventMessage) {
	if (!streamProducer.isOpen) return;

	await streamProducer.xAdd(
		`stream:${message.event}`,
		"*",
		{
			data: JSON.stringify(message, bigintReplacer),
		},
		{
			TRIM: {
				strategy: "MINID",
				strategyModifier: "=",
				threshold: Date.now() - config.streamRetentionMs,
			},
		},
	);
}

export async function publishEvent(message: PublishEventMessage) {
	if (!publisher.isOpen) return;

	await publisher.publish(`${message.event}:${message.symbol}`, JSON.stringify(message));
}

export async function publishDepth({
	symbol,
	price,
	qty,
	side,
}: {
	symbol: string;
	price: bigint;
	qty: bigint;
	side: "bids" | "asks";
}) {
	const lastUpdateId = await safeIncr("engine:depth:last_id", () => ++localDepthId);

	const message: PublishEventMessage = {
		event: "depth",
		symbol,
		bids: side === "bids" ? [{ price: price.toString(), qty: qty.toString() }] : [],
		asks: side === "asks" ? [{ price: price.toString(), qty: qty.toString() }] : [],
		lastUpdateId,
		timestamp: Date.now(),
	};

	publishEvent(message).catch((err) => {
		logger.error("Failed to publish depth", err);
	});
}

export async function publishFill(fill: Fill) {
	streamEvent({ event: "fill", fill });

	const message: PublishEventMessage = {
		event: "trade",
		symbol: fill.symbol,
		id: fill.id,
		price: fill.price.toString(),
		qty: fill.qty.toString(),
		maker: fill.isBuyerMaker,
		timestamp: fill.createdAt,
	};

	publishEvent(message).catch((err) => {
		logger.error("Failed to publish trade", err);
	});
}

export async function getLastUpdateId(): Promise<number> {
	try {
		if (!cacheClient.isOpen) return localDepthId;
		const val = await cacheClient.get("engine:depth:last_id");
		return Number(val ?? "0");
	} catch {
		return localDepthId;
	}
}
