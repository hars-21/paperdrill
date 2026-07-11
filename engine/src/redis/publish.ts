import { cacheClient, publisher, streamProducer } from "./client";
import type { EventMessage } from "../types/event";
import type { Depth, Symbol } from "../types/domain";
import { logger } from "../logger";

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

export async function publishEvent(message: EventMessage) {
	if (!publisher.isOpen) {
		return;
	}

	await publisher.publish(`${message.event}:${message.symbol}`, JSON.stringify(message));

	if (message.event === "trade") {
		await streamProducer.xAdd(`${message.event}`, "*", {
			data: JSON.stringify(message),
		});
	}
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

	const message: EventMessage = {
		event: "depth",
		lastUpdateId,
		timestamp: Date.now(),
		...depth,
	};

	publishEvent(message).catch((err) => {
		logger.error("Failed to publish depth", err);
	});
}

export async function publishFill({
	symbol,
	price,
	qty,
	maker,
	timestamp,
}: {
	symbol: Symbol;
	price: bigint;
	qty: bigint;
	maker: boolean;
	timestamp: number;
}) {
	const id = await safeIncr("engine:trade:last_id", () => ++localTradeId);

	const message: EventMessage = {
		event: "trade",
		symbol,
		price: price.toString(),
		qty: qty.toString(),
		maker,
		id,
		timestamp,
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
