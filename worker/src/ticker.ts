import { pool } from "./db";
import { publisher } from "./redis";
import { logger } from "./logger";
import type { Trade } from "./types";

const TICKER_WINDOW_MS = 24 * 60 * 60 * 1000;
const TICKER_PUBLISH_INTERVAL_MS = 1000;

const TICKER_CHANNEL_PREFIX = "ticker:";
const TICKER_STATE_KEY_PREFIX = "market:ticker:";

interface TickerTrade {
	price: bigint;
	qty: bigint;
	timestamp: number;
}

interface TickerState {
	symbol: string;
	trades: TickerTrade[];
	lastPrice: bigint;
	openPrice: bigint;
	high: bigint;
	low: bigint;
	volume: bigint;
	quoteVolume: bigint;
	lastTradeAt: number;
	dirty: boolean;
	lastPublishedAt: number;
	timer: ReturnType<typeof setTimeout> | null;
}

const tickers = new Map<string, TickerState>();

let warmingUp = false;

function createTickerState(symbol: string, price: bigint, qty: bigint, timestamp: number): TickerState {
	return {
		symbol,
		trades: [{ price, qty, timestamp }],
		lastPrice: price,
		openPrice: price,
		high: price,
		low: price,
		volume: qty,
		quoteVolume: price * qty,
		lastTradeAt: timestamp,
		dirty: true,
		lastPublishedAt: 0,
		timer: null,
	};
}

function recomputeHighLow(state: TickerState) {
	const first = state.trades[0];
	if (!first) return;

	let high = first.price;
	let low = first.price;

	for (const trade of state.trades) {
		if (trade.price > high) high = trade.price;
		if (trade.price < low) low = trade.price;
	}

	state.high = high;
	state.low = low;
}

export function deriveTicker(data: Trade) {
	const { symbol, price, qty, timestamp } = data;

	let state = tickers.get(symbol);

	if (!state) {
		state = createTickerState(symbol, price, qty, timestamp);
		tickers.set(symbol, state);
	} else {
		const cutoff = timestamp - TICKER_WINDOW_MS;
		let droppedExtreme = false;

		while (state.trades.length > 0) {
			const head = state.trades[0]!;
			if (head.timestamp > cutoff) break;
			state.trades.shift();
			state.volume -= head.qty;
			state.quoteVolume -= head.price * head.qty;
			if (head.price === state.high || head.price === state.low) {
				droppedExtreme = true;
			}
		}

		if (state.trades.length === 0) {
			state.high = price;
			state.low = price;
		} else if (droppedExtreme) {
			recomputeHighLow(state);
		}

		state.trades.push({ price, qty, timestamp });
		state.volume += qty;
		state.quoteVolume += price * qty;
		if (price > state.high) state.high = price;
		if (price < state.low) state.low = price;
		state.lastPrice = price;
		state.openPrice = state.trades[0]?.price ?? price;
		state.lastTradeAt = timestamp;
	}

	state.dirty = true;
	schedulePublish(state);
}

function schedulePublish(state: TickerState) {
	if (warmingUp) return;
	if (state.timer) return;

	const now = Date.now();
	const elapsed = now - state.lastPublishedAt;
	const delay = Math.max(0, TICKER_PUBLISH_INTERVAL_MS - elapsed);

	state.timer = setTimeout(() => {
		state.timer = null;
		publishTicker(state).catch((err) => {
			logger.error("Failed to publish ticker", {
				symbol: state.symbol,
				error: err instanceof Error ? err.message : String(err),
			});
		});
	}, delay);
}

function toPayload(state: TickerState) {
	return JSON.stringify({
		event: "ticker",
		symbol: state.symbol,
		lastPrice: state.lastPrice.toString(),
		openPrice: state.openPrice.toString(),
		high: state.high.toString(),
		low: state.low.toString(),
		volume: state.volume.toString(),
		quoteVolume: state.quoteVolume.toString(),
		timestamp: state.lastTradeAt,
	});
}

export async function publishTicker(state: TickerState) {
	if (!state.dirty) return;
	state.dirty = false;
	state.lastPublishedAt = Date.now();

	const payload = toPayload(state);

	await Promise.all([
		publisher.publish(`${TICKER_CHANNEL_PREFIX}${state.symbol}`, payload),
		publisher.set(`${TICKER_STATE_KEY_PREFIX}${state.symbol}`, payload),
	]);
}

export async function warmUpTickers() {
	try {
		warmingUp = true;
		const cutoff = new Date(Date.now() - TICKER_WINDOW_MS);

		const { rows } = await pool.query<{ symbol: string; price: string; qty: string; ts: string }>(
			`SELECT symbol, price::text AS price, qty::text AS qty,
			        (EXTRACT(EPOCH FROM "createdAt") * 1000)::float8 AS ts
			 FROM "Fill"
			 WHERE "createdAt" >= $1
			 ORDER BY "createdAt" ASC`,
			[cutoff],
		);

		for (const row of rows) {
			deriveTicker({
				event: "trade",
				symbol: row.symbol,
				id: "warmup",
				price: BigInt(row.price),
				qty: BigInt(row.qty),
				maker: false,
				timestamp: Math.floor(Number(row.ts)),
			});
		}

		warmingUp = false;

		for (const state of tickers.values()) {
			state.dirty = true;
			await publishTicker(state);
		}

		logger.info(`Warmed up ${tickers.size} tickers from database fills`);
	} catch (err) {
		warmingUp = false;
		logger.warn(
			"Failed to warm up tickers from database, tickers will aggregate from new trades only",
			err,
		);
	}
}