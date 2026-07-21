import { createClient } from "redis";
import { config } from "../config";
import { logger } from "../logger";

export const streamConsumer = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis streamConsumer error", { error: (err as Error).message }),
);

export const streamProducer = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis streamProducer error", { error: (err as Error).message }),
);

export const publisher = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis publisher error", { error: (err as Error).message }),
);

export const cacheClient = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis cacheClient error", { error: (err as Error).message }),
);

export const ackConsumer = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis ackConsumer error", { error: (err as Error).message }),
);

export async function connectRedis() {
	return Promise.all([
		streamConsumer.connect(),
		streamProducer.connect(),
		publisher.connect(),
		cacheClient.connect(),
		ackConsumer.connect(),
	]);
}

export async function disconnectRedis() {
	await Promise.allSettled([
		streamConsumer.quit(),
		streamProducer.quit(),
		publisher.quit(),
		cacheClient.quit(),
		ackConsumer.quit(),
	]);
}
