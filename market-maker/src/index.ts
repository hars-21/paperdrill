import { sleep } from "bun";
import { config } from "./config";
import { consumeEvents } from "./consumer";
import { connectDB, disconnectDB, resolveMarkets, type ResolvedMarket } from "./db";
import { createCommandWriter } from "./engine";
import { logger } from "./logger";
import { getAnchorScaled } from "./price";
import { connectRedis, disconnectRedis, readClient, commandClient } from "./redis";
import { runMarketCycle } from "./runner";
import { MakerState } from "./state";

const abortController = new AbortController();

async function quoteLoop(
	market: ResolvedMarket,
	state: MakerState,
	writer: ReturnType<typeof createCommandWriter>,
): Promise<void> {
	const quoteMarket = {
		...market,
		levelsPerSide: config.levelsPerSide,
		spreadBps: config.spreadBps,
		levelStepBps: config.levelStepBps,
		driftBps: config.driftBps,
		maxSkewBps: config.maxSkewBps,
		staleOrderMs: config.staleOrderMs,
		maxOrderNotional: config.maxOrderNotional,
		maxInventoryNotional: config.maxInventoryNotional,
	};

	while (!abortController.signal.aborted) {
		try {
			const anchorScaled = await getAnchorScaled(market.symbol, readClient, {
				...config,
				pricePrecision: market.pricePrecision,
			});
			if (!anchorScaled) {
				logger.debug("No price anchor available", { symbol: market.symbol });
			} else {
				const { cancelled, created } = await runMarketCycle({
					market: quoteMarket,
					userId: market.userId,
					anchorScaled,
					maxTopUpNotional: config.maxTopUpNotional,
					writer,
					state,
				});
				logger.debug("Quote cycle complete", { symbol: market.symbol, cancelled, created });
			}
		} catch (err) {
			logger.error("Quote cycle failed", err, { symbol: market.symbol });
		}

		await sleep(config.quoteIntervalMs);
	}
}

async function main() {
	await connectRedis();
	await connectDB();

	const markets = await resolveMarkets();
	const ownerUserIds = new Set(markets.map((market) => market.userId));
	const state = new MakerState(ownerUserIds);
	const writer = createCommandWriter(commandClient, config);

	void consumeEvents({
		client: readClient,
		config: {
			stream: config.eventStream,
			cursorKey: config.eventCursorKey,
			blockMs: config.eventBlockMs,
			batchSize: config.eventBatchSize,
		},
		state,
		isAborted: () => abortController.signal.aborted,
		onError: (message, err) => logger.error(message, err),
	}).catch((err) => logger.error("Event consumer stopped", err));

	const loops = markets.map((market) => quoteLoop(market, state, writer));
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, () => abortController.abort());
	}

	logger.info("Market maker started", { markets: markets.map((market) => market.symbol) });
	await Promise.all(loops);

	await disconnectRedis();
	await disconnectDB();
	logger.info("Market maker stopped");
}

main().catch((err) => {
	logger.error("Market maker failed to start", err);
	process.exit(1);
});
