import { createClient } from "redis";
import { config } from "./config";
import { logger } from "./utils/logger";

export const publisher = createClient({ url: config.redis.url }).on("error", (err) =>
	logger.error("Redis publisher error", { error: err instanceof Error ? err.message : String(err) }),
);

export const responsesubscriber = createClient({ url: config.redis.url }).on("error", (err) =>
	logger.error("Redis response subscriber error", {
		error: err instanceof Error ? err.message : String(err),
	}),
);

export const marketSubscriber = createClient({ url: config.redis.url }).on("error", (err) =>
	logger.error("Redis market subscriber error", {
		error: err instanceof Error ? err.message : String(err),
	}),
);

export async function connectRedis() {
	return Promise.all([
		publisher.connect(),
		responsesubscriber.connect(),
		marketSubscriber.connect(),
	]);
}

export async function pingRedis() {
	return publisher.ping();
}

export async function disconnectRedis() {
	await Promise.allSettled([marketSubscriber.pUnsubscribe(["depth:*", "trade:*", "candle:*"])]);

	await Promise.allSettled([publisher.quit(), responsesubscriber.quit(), marketSubscriber.quit()]);
}
