import "dotenv/config";
import z from "zod";

const marketBindingSchema = z.object({
	symbol: z.string().trim().min(1),
	serviceEmail: z.email(),
});

const decimalSchema = z
	.string()
	.trim()
	.regex(/^\d+(\.\d+)?$/, "must be a non-negative decimal string");

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	REDIS_URL: z.string().trim().min(1),
	DATABASE_URL: z.string().trim().min(1),
	LOG_LEVEL: z.enum(["debug", "info"]).default("info"),

	INCOMING_STREAM: z.string().default("backend-to-engine-broker"),
	INCOMING_STREAM_MAXLEN: z.coerce.number().int().positive().default(50_000),
	EVENT_STREAM: z.string().default("stream:engine-events"),
	EVENT_CURSOR_KEY: z.string().default("market-maker:event:last_id"),
	EVENT_BLOCK_MS: z.coerce.number().int().positive().default(1_000),
	EVENT_BATCH_SIZE: z.coerce.number().int().positive().default(200),
	TICKER_KEY_PREFIX: z.string().default("market:ticker:"),
	RESPONSE_QUEUE_PREFIX: z.string().default("response-queue-mm-"),

	// Allowlist: symbol -> seeded SERVICE account that owns its quotes.
	MARKETS: z.string().min(1).transform((value, ctx) => {
		try {
			return z.array(marketBindingSchema).parse(JSON.parse(value));
		} catch {
			ctx.addIssue({ code: "custom", message: "MARKETS must be a JSON array of bindings" });
			return z.NEVER;
		}
	}),

	QUOTE_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
	LEVELS_PER_SIDE: z.coerce.number().int().positive().default(8),
	SPREAD_BPS: z.coerce.number().int().nonnegative().default(20),
	LEVEL_STEP_BPS: z.coerce.number().int().positive().default(6),
	DRIFT_BPS: z.coerce.number().int().nonnegative().default(8),
	MAX_SKEW_BPS: z.coerce.number().int().nonnegative().default(30),
	STALE_ORDER_MS: z.coerce.number().int().positive().default(30_000),
	MAX_ORDER_NOTIONAL: decimalSchema.default("25"),
	MAX_INVENTORY_NOTIONAL: decimalSchema.default("250"),
	MAX_TOP_UP_NOTIONAL: decimalSchema.default("500"),

	TICKER_MAX_AGE_MS: z.coerce.number().int().positive().default(15_000),
	ORACLE_CACHE_MS: z.coerce.number().int().positive().default(5_000),
	ORACLE_TIMEOUT_MS: z.coerce.number().int().positive().default(2_000),
});

const env = envSchema.parse(process.env);

export interface MarketBinding {
	symbol: string;
	serviceEmail: string;
}

export const config = {
	env: env.NODE_ENV,
	redisUrl: env.REDIS_URL,
	databaseUrl: env.DATABASE_URL,
	logLevel: env.LOG_LEVEL,

	incomingStream: env.INCOMING_STREAM,
	incomingStreamMaxLen: env.INCOMING_STREAM_MAXLEN,
	eventStream: env.EVENT_STREAM,
	eventCursorKey: env.EVENT_CURSOR_KEY,
	eventBlockMs: env.EVENT_BLOCK_MS,
	eventBatchSize: env.EVENT_BATCH_SIZE,
	tickerKeyPrefix: env.TICKER_KEY_PREFIX,
	responseQueuePrefix: env.RESPONSE_QUEUE_PREFIX,

	markets: env.MARKETS as MarketBinding[],
	quoteIntervalMs: env.QUOTE_INTERVAL_MS,
	levelsPerSide: env.LEVELS_PER_SIDE,
	spreadBps: env.SPREAD_BPS,
	levelStepBps: env.LEVEL_STEP_BPS,
	driftBps: env.DRIFT_BPS,
	maxSkewBps: env.MAX_SKEW_BPS,
	staleOrderMs: env.STALE_ORDER_MS,
	maxOrderNotional: Number(env.MAX_ORDER_NOTIONAL),
	maxInventoryNotional: Number(env.MAX_INVENTORY_NOTIONAL),
	maxTopUpNotional: Number(env.MAX_TOP_UP_NOTIONAL),

	tickerMaxAgeMs: env.TICKER_MAX_AGE_MS,
	oracleCacheMs: env.ORACLE_CACHE_MS,
	oracleTimeoutMs: env.ORACLE_TIMEOUT_MS,
};
