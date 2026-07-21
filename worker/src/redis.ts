import { createClient } from "redis";
import { config } from "./config";
import { logger } from "./logger";

export const publisher = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis publisher error", { error: (err as Error).message }),
);

export const streamConsumer = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis streamConsumer error", { error: (err as Error).message }),
);

export const cacheClient = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis cacheClient error", { error: (err as Error).message }),
);

export async function connectRedis() {
	return Promise.all([publisher.connect(), streamConsumer.connect(), cacheClient.connect()]);
}

export async function disconnectRedis() {
	await Promise.allSettled([publisher.quit(), streamConsumer.quit(), cacheClient.quit()]);
}

export async function sendAck(type: "fill" | "order", ids: string[]) {
	if (!publisher.isOpen) return;
	await publisher.xAdd("stream:ack", "*", {
		data: JSON.stringify({ type, ids }),
	});
}
