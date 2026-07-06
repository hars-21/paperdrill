import type { Request, Response } from "express";
import {
	candleQuerySchema,
	orderBodySchema,
	orderIdParamSchema,
	symbolParamSchema,
} from "../types/exchange";
import { sendToEngine } from "../utils/engineClient";
import { prisma } from "../db";
import { sendValidationError } from "../utils/validation";
import { marketStore } from "../store/market";
import { toBigInt } from "../utils/convert";
import {
	formatOrder,
	formatOrders,
	formatTrades,
	formatDepth,
	formatCandles,
	formatBalance,
	formatCancel,
} from "../utils/formatter";
import { logger } from "../utils/logger";

const intervalMap = {
	"15M": "15 minutes",
	"1H": "1 hour",
	"4H": "4 hours",
	"1D": "1 day",
};

export function getUserId(req: Request): string {
	if (!req.userId) {
		throw new Error("Missing authenticated user");
	}
	return req.userId;
}

// Orders
export async function createOrder(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedBody = orderBodySchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { side, type, symbol, qty } = parsedBody.data;

	const market = marketStore.get(symbol);

	if (!market) throw new Error(`Unknown market: ${symbol}`);

	const scaledQty = toBigInt(qty, market.qtyPrecision);
	const scaledPrice =
		type === "MARKET" ? null : toBigInt(parsedBody.data.price, market.pricePrecision);
	const orderId = crypto.randomUUID();

	const engineResponse = await sendToEngine("create_order", {
		orderId,
		userId,
		type,
		side,
		symbol,
		price: scaledPrice?.toString() ?? null,
		qty: scaledQty.toString(),
	});

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatOrder(engineResponse.data as Record<string, unknown>));
}

export async function getOpenOrders(req: Request, res: Response) {
	const userId = getUserId(req);

	const engineResponse = await sendToEngine("get_open_orders", { userId });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatOrders(engineResponse.data as Record<string, unknown>[]));
}

export async function getOrder(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedParams = orderIdParamSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	const { orderId } = parsedParams.data;

	const engineResponse = await sendToEngine("get_order", { userId, orderId });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatOrder(engineResponse.data as Record<string, unknown>));
}

export async function cancelOrder(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedParams = orderIdParamSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	const { orderId } = parsedParams.data;
	const engineResponse = await sendToEngine("cancel_order", { userId, orderId });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatCancel(engineResponse.data as Record<string, unknown>));
}

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
	const { limit = 100 } = req.query;

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	const { symbol } = parsedParams.data;

	const engineResponse = await sendToEngine("get_trades", { symbol, limit });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatTrades(engineResponse.data as Record<string, unknown>[]));
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
	    symbol, open, high, low, close,
	    volume::float8
	  FROM (
	    SELECT
	      time_bucket(${bucket}, "time") AS bucket,
	      symbol,
		  FIRST(open, "time") AS open,
	      MAX(high) AS high,
	      MIN(low) AS low,
		  LAST(close, "time") AS close,
	      SUM(volume)::float8 AS volume
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

// Balances
export async function getBalance(req: Request, res: Response) {
	const userId = getUserId(req);

	const engineResponse = await sendToEngine("get_user_balance", { userId });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res
		.status(200)
		.json(formatBalance(engineResponse.data as Record<string, Record<string, unknown>>));
}
