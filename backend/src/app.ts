import express, { type NextFunction, type Request, type Response } from "express";
import { pingRedis } from "./redis";
import { prisma } from "./db";
import { appRouter } from "./routes";
import { config } from "./config";
import { logger } from "./utils/logger";
import cors from "cors";

export const app = express();

app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
	res.status(200).json({
		message: "Welcome to Centralised Exchange",
		status: "running",
		success: true,
	});
});

app.get("/health", async (_req: Request, res: Response) => {
	try {
		await pingRedis();
		await prisma.$queryRaw`SELECT 1`;

		res.status(200).json({ success: true, status: "ok" });
	} catch (err) {
		logger.error("Health check failed", err);
		res.status(503).json({ success: false, status: "error" });
	}
});

app.use("/", appRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	logger.error("Unhandled error", err);
	const message =
		config.app.env === "production"
			? "Internal server error"
			: err instanceof Error
				? err.message
				: "Internal server error";
	res.status(500).json({ error: message });
});
