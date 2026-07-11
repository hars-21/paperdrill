import { cacheClient, publisher, streamProducer } from "./client";
import type { PublishEventMessage } from "../types/event";
import type { Depth, Fill, Symbol } from "../types/domain";
import { logger } from "../logger";
import { streamEvent } from "./stream";

let localDepthId = 0;
let localTradeId = 0;

async function safeIncr(key: string, fallbackFn: () => number): Promise<number> {
	try {
		if (!cacheClient.isOpen) return fallbackFn();
		return await cacheClient.incr(key);
	} catch {
		return fallbackFn();
	}
}

export async function publishEvent(message: PublishEventMessage) {
	if (!publisher.isOpen) {
		return;
	}

	await publisher.publish(`${message.event}:${message.symbol}`, JSON.stringify(message));
}

export async function publishDepth({
	symbol,
	price,
	qty,
	side,
}: {
	symbol: Symbol;
	price: bigint;
	qty: bigint;
	side: "bids" | "asks";
}) {
	const depth: Depth = {
		symbol,
		bids: [],
		asks: [],
	};

	depth[side].push({ price: price.toString(), qty: qty.toString() });

	const lastUpdateId = await safeIncr("engine:depth:last_id", () => ++localDepthId);

	const message: PublishEventMessage = {
		event: "depth",
		lastUpdateId,
		timestamp: Date.now(),
		...depth,
	};

	publishEvent(message).catch((err) => {
		logger.error("Failed to publish depth", err);
	});
}

export async function publishFill(fill: Fill) {
	const id = await safeIncr("engine:trade:last_id", () => ++localTradeId);

	const message: PublishEventMessage = {
		event: "trade",
		symbol: fill.symbol,
		price: fill.price.toString(),
		qty: fill.qty.toString(),
		maker: fill.isBuyerMaker,
		id,
		timestamp: fill.createdAt,
	};

	streamEvent({
		event: "fill",
		fill,
	});

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
