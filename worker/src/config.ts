import z from "zod";
import "dotenv/config";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	REDIS_URL: z.string().trim().min(1, "Redis Url is required"),
	DATABASE_URL: z.string().trim().min(1, "Database Url is required"),
	LOG_LEVEL: z.enum(["debug", "info"]),
	STREAM_RETENTION_MS: z.coerce.number().default(30 * 60 * 1000),
	FLUSH_INTERVAL_MS: z.coerce.number().default(10000),
});

const env = envSchema.parse(process.env);

export const config = {
	env: env.NODE_ENV,
	redisUrl: env.REDIS_URL,
	dbUrl: env.DATABASE_URL,
	logLevel: env.LOG_LEVEL,
	streamRetentionMs: env.STREAM_RETENTION_MS,
	flushIntervalMs: env.FLUSH_INTERVAL_MS,
};
