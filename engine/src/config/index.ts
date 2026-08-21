import "dotenv/config";
import z from "zod";

export const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	REDIS_URL: z.string(),
	INCOMING_STREAM: z.string().default("backend-to-engine-broker"),
	LOG_LEVEL: z.enum(["debug", "info"]),
	SNAPSHOT_INTERVAL: z.string().default("3600000"),
	STREAM_RETENTION_MS: z.coerce.number().default(30 * 60 * 1000),
});

const env = envSchema.parse(process.env);

export const config = {
	env: env.NODE_ENV,
	redisUrl: env.REDIS_URL,
	incomingStream: env.INCOMING_STREAM,
	logLevel: env.LOG_LEVEL,
	snapshotInterval: parseInt(env.SNAPSHOT_INTERVAL, 10),
	streamRetentionMs: env.STREAM_RETENTION_MS,
};
