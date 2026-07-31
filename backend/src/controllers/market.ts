import type { Request, Response } from "express";
import { candleQuerySchema, symbolParamSchema, tradesQuerySchema } from "../types/exchange";
import { sendToEngine } from "../utils/engineClient";
import { prisma } from "../db";
import { sendValidationError } from "../utils/validation";
import { formatTrades, formatDepth, formatCandles } from "../utils/formatter";
import { logger } from "../utils/logger";

const intervalMap = {
	"15M": "15 minutes",
	"1H": "1 hour",
	"4H": "4 hours",
	"1D": "1 day",
};

// Markets
export async function getMarkets(_req: Request, res: Response) {
	try {
		const markets = await prisma.market.findMany();

		res.status(200).json({ data: markets });
	} catch (e) {
		logger.error("Failed to fetch markets", e);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function getTrades(req: Request, res: Response) {
	const parsedParams = symbolParamSchema.safeParse(req.params);
	const parsedQueries = tradesQuerySchema.safeParse(req.query);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	if (!parsedQueries.success) {
		sendValidationError(res, parsedQueries.error);
		return;
	}

	try {
		const { symbol } = parsedParams.data;
		const { limit = 50 } = parsedQueries.data;

		const trades = await prisma.fill.findMany({
			where: { symbol },
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		res.status(200).json(formatTrades(trades as Record<string, unknown>[]));
	} catch (err) {
		logger.error("Failed to fetch trades", err);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function getDepth(req: Request, res: Response) {
	const parsedParams = symbolParamSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	const { symbol } = parsedParams.data;

	const engineResponse = await sendToEngine("get_depth", { symbol });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatDepth(engineResponse.data as Record<string, unknown>, symbol));
}

// Candles
export async function getCandles(req: Request, res: Response) {
	const parsedParams = symbolParamSchema.safeParse(req.params);
	const parsedQueries = candleQuerySchema.safeParse(req.query);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	if (!parsedQueries.success) {
		sendValidationError(res, parsedQueries.error);
		return;
	}

	const { symbol } = parsedParams.data;
	const { interval = "15M" } = parsedQueries.data;
	const bucket = intervalMap[interval];

	try {
		const candles = await prisma.$queryRaw`
      SELECT
        (EXTRACT(EPOCH FROM bucket) * 1000)::float8 AS "time",
        symbol, open, high, low, close, volume
      FROM (
        SELECT
          time_bucket(${bucket}, "time") AS bucket,
          symbol,
          FIRST(open, "time") AS open,
          MAX(high) AS high,
          MIN(low) AS low,
          LAST(close, "time") AS close,
          SUM(volume) AS volume
        FROM "Candle"
        WHERE symbol = ${symbol}
        GROUP BY bucket, symbol
      ) sub
      ORDER BY "time";
    `;

		res.status(200).json({
			data: formatCandles(candles as Record<string, unknown>[]),
		});
	} catch (err) {
		logger.error("Failed to fetch candles", err);
		res.status(500).json({ error: "Internal server error" });
	}
}
