import z from "zod";
import "dotenv/config";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	REDIS_URL: z.string().trim().min(1, "Redis Url is required"),
	DATABASE_URL: z.string().trim().min(1, "Database Url is required"),
	LOG_LEVEL: z.enum(["debug", "info"]),
});

const env = envSchema.parse(process.env);

export const config = {
	env: env.NODE_ENV,
	redisUrl: env.REDIS_URL,
	dbUrl: env.DATABASE_URL,
	logLevel: env.LOG_LEVEL,
};
