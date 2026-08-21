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
	await connectRedis()
		.then(() => logger.info("Connected to Redis"))
		.catch((err) => {
			logger.error("Error connecting to Redis", err);
			process.exit(1);
		});

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

	try {
		await new Promise<void>((resolve) => httpServer.close(() => resolve()));
	} catch (err) {
		logger.error("Error closing HTTP server", err);
	}

	try {
		wss.close();
	} catch (err) {
		logger.error("Error closing WebSocket server", err);
	}

	try {
		await disconnectRedis();
	} catch (err) {
		logger.error("Error disconnecting Redis", err);
	}

	try {
		await prisma.$disconnect();
	} catch (err) {
		logger.error("Error disconnecting Prisma", err);
	}

	clearTimeout(forceExit);
	process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
	logger.error("Unhandled promise rejection", reason);
});

process.on("uncaughtException", (err) => {
	logger.error("Uncaught exception", err);
	gracefulShutdown("uncaughtException").then(() => process.exit(1));
});

main().catch((err) => {
	logger.error("Fatal startup error", err);
	process.exit(1);
});
