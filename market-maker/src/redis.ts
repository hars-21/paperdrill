import { createClient } from "redis";
import { config } from "./config";
import { logger } from "./logger";

export const commandClient = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis command client error", err),
);

export const readClient = createClient({ url: config.redisUrl }).on("error", (err) =>
	logger.error("Redis read client error", err),
);

export async function connectRedis() {
	try {
		await Promise.all([commandClient.connect(), readClient.connect()]);
		logger.info("Connected to Redis");
	} catch (err) {
		logger.error("Redis connection error", err);
		throw err;
	}
}

export async function disconnectRedis() {
	await Promise.all([
		commandClient.isOpen ? commandClient.quit() : Promise.resolve(),
		readClient.isOpen ? readClient.quit() : Promise.resolve(),
	]);
}
