import { createClient } from "redis";
import { config } from "../config";
import { logger } from "../util/logger";

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
		process.exit(1);
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
