import "dotenv/config";
import type { CookieOptions } from "express";
import z from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]),
	PORT: z.coerce.number().default(8000),
	CORS_ORIGIN: z.string(),

	REDIS_URL: z.string(),
	DATABASE_URL: z.string(),

	JWT_SECRET: z.string(),
	SERVICE_TOKEN_HASH: z.string().default(""),

	INCOMING_STREAM: z.string().default("backend-to-engine-broker"),
	BACKEND_QUEUE_ID: z.string().default(crypto.randomUUID()),
	ENGINE_TIMEOUT_MS: z.coerce.number().default(30000),

	RATE_LIMIT_ENABLED: z
		.string()
		.transform((v) => v !== "false")
		.default(true),
	RATE_LIMIT_API_MAX: z.coerce.number().default(600),
	RATE_LIMIT_API_WINDOW_MS: z.coerce.number().default(60000),
	RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
	RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(15 * 60000),
	RATE_LIMIT_ORDER_MAX: z.coerce.number().default(30),
	RATE_LIMIT_ORDER_WINDOW_MS: z.coerce.number().default(60000),

	STREAM_RETENTION_MS: z.coerce.number().default(30 * 60 * 1000),

	LOG_LEVEL: z.enum(["debug", "info"]),
});

const env = envSchema.parse(process.env);

const isProduction = env.NODE_ENV === "production";

export const config = {
	app: {
		env: env.NODE_ENV,
		port: env.PORT,
		logLevel: env.LOG_LEVEL,
	},

	engine: {
		incomingStream: env.INCOMING_STREAM,
		timeout: env.ENGINE_TIMEOUT_MS,
		responseQueue: `response-queue-${env.BACKEND_QUEUE_ID}`,
	},

	db: {
		url: env.DATABASE_URL,
	},

	redis: {
		url: env.REDIS_URL,
		retentionMs: env.STREAM_RETENTION_MS,
	},

	rateLimit: {
		enabled: env.RATE_LIMIT_ENABLED,
		api: {
			max: env.RATE_LIMIT_API_MAX,
			windowMs: env.RATE_LIMIT_API_WINDOW_MS,
		},
		auth: {
			max: env.RATE_LIMIT_AUTH_MAX,
			windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
		},
		order: {
			max: env.RATE_LIMIT_ORDER_MAX,
			windowMs: env.RATE_LIMIT_ORDER_WINDOW_MS,
		},
	},

	auth: {
		jwtSecret: env.JWT_SECRET,
		serviceTokenHash: env.SERVICE_TOKEN_HASH,
	},

	cors: {
		origin: env.NODE_ENV === "production" ? env.CORS_ORIGIN.split(",") : ["http://localhost:3000"],
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
		optionsSuccessStatus: 200,
		credentials: true,
	},

	cookie: {
		httpOnly: true,
		secure: isProduction,
		sameSite: isProduction ? "none" : "lax",
		path: "/",
	} satisfies CookieOptions,
};
