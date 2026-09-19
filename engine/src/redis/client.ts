import { createClient } from "redis";
import { config } from "../config";
import { logger } from "../util/logger";

export const streamConsumer = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis streamConsumer error", err),
);

export const streamProducer = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis streamProducer error", err),
);

export const publisher = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis publisher error", err),
);

export const cacheClient = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis cacheClient error", err),
);

export async function connectRedis() {
	try {
		await Promise.all([
			streamConsumer.connect(),
			streamProducer.connect(),
			publisher.connect(),
			cacheClient.connect(),
		]);
		logger.info(`Engine listening on Redis queue: ${config.incomingStream}`);
	} catch (err) {
		logger.error("Redis connection error", err);
		throw err;
	}
}

export async function disconnectRedis() {
	try {
		await Promise.allSettled([
			streamConsumer.quit(),
			streamProducer.quit(),
			publisher.quit(),
			cacheClient.quit(),
		]);
	} catch (err) {
		logger.error("Redis disconnection error", err);
	}
}
