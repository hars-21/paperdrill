import "dotenv";
import {
	engineAbortController,
	listenForEngineresponses,
	listenForOrderbookDepth,
} from "./utils/engineClient";
import { config } from "./config";
import { createAppServer } from "./server";
import { connectRedis, disconnectRedis } from "./redis";
import { logger } from "./utils/logger";
import { prisma } from "./db";
import { loadMarkets } from "./store/market";

const { httpServer, wss } = createAppServer();

async function main() {
	await loadMarkets();
	await connectRedis();

	listenForEngineresponses().catch((err) => logger.error("Engine listener error", err));
	listenForOrderbookDepth().catch((err) => logger.error("Orderbook listener error", err));

	httpServer.listen(config.app.port, () => {
		logger.info(`HTTP + WS server running on port ${config.app.port}`);
	});
}

async function gracefulShutdown(signal: string) {
	logger.info(`Received ${signal}, shutting down gracefully...`);

	const forceExit = setTimeout(() => {
		logger.error("Graceful shutdown timed out, forcing exit");
		process.exit(1);
	}, 10000);

	engineAbortController.abort();

	httpServer.close();
	wss.close();

	await disconnectRedis();
	await prisma.$disconnect();

	clearTimeout(forceExit);
	process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

main();
