import express, { type Request, type Response } from "express";
import cors from "cors";
import { pingRedis } from "./redis";
import { prisma } from "./db";
import { appRouter } from "./routes";
import { config } from "./config";
import { logger } from "./utils/logger";
import { apiLimiter } from "./middleware/rateLimit";
import { authenticate } from "./middleware/auth";
import { errorHandler, notFoundHandler, requestContext } from "./middleware/errors";
import { sendApiError } from "./utils/apiError";

export const app = express();

app.set("trust proxy", 1);

app.use(requestContext);
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(authenticate);
app.use(apiLimiter);

app.get("/", (_req: Request, res: Response) => {
	res.status(200).json({
		message: "Welcome to PaperDrill",
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
		sendApiError(res, 503, "SERVICE_UNAVAILABLE", "A required service is unavailable");
	}
});

app.use("/v1", appRouter);
app.use(notFoundHandler);
app.use(errorHandler);
