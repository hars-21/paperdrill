import type { Request, Response } from "express";
import { orderBodySchema, orderIdParamSchema, orderQuerySchema } from "../schema/exchange";
import { sendToEngine } from "../utils/engineClient";
import { sendValidationError } from "../utils/validation";
import { marketStore } from "../store/market";
import { toBigInt } from "../utils/convert";
import { formatOrder, formatOrders, formatCancel } from "../utils/formatter";
import { getUserId } from "./user";
import { prisma } from "../db";
import { logger } from "../utils/logger";

export async function createOrder(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedBody = orderBodySchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { side, type, symbol, qty } = parsedBody.data;

	const market = marketStore.get(symbol);

	if (!market) {
		res.status(400).json({ error: `Unknown market: ${symbol}` });
		return;
	}

	const scaledQty = toBigInt(qty, market.qtyPrecision);
	const scaledPrice =
		type === "MARKET" ? null : toBigInt(parsedBody.data.price, market.pricePrecision);
	const id = crypto.randomUUID();

	const engineResponse = await sendToEngine("create_order", {
		id,
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

export async function getOrders(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedQueries = orderQuerySchema.safeParse(req.query);

	if (!parsedQueries.success) {
		sendValidationError(res, parsedQueries.error);
		return;
	}

	try {
		const { symbol, status, limit = 10, page = 1 } = parsedQueries.data;

		const orders = await prisma.order.findMany({
			where: {
				userId: userId,
				symbol: symbol,
				status: status,
			},
			take: limit,
			skip: (page - 1) * limit,
			orderBy: { createdAt: "desc" },
		});

		if (!orders) {
			res.status(404).json({ error: "Order not found" });
			return;
		}

		res.status(200).json(formatOrders(orders));
	} catch (err) {
		logger.error("Failed to fetch order", err);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function getOrderById(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedParams = orderIdParamSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	try {
		const { orderId } = parsedParams.data;

		const order = await prisma.order.findUnique({
			where: {
				id: orderId,
				userId: userId,
			},
		});

		if (!order) {
			res.status(404).json({ error: "Order not found" });
			return;
		}

		res.status(200).json(formatOrder(order as Record<string, unknown>));
	} catch (err) {
		logger.error("Failed to fetch order", err);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function cancelOrder(req: Request, res: Response) {
	const userId = getUserId(req);
	const parsedParams = orderIdParamSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error);
		return;
	}

	const { orderId } = parsedParams.data;
	const engineResponse = await sendToEngine("cancel_order", { userId, id: orderId });

	if (!engineResponse.success) {
		res.status(400).json({ error: engineResponse.error });
		return;
	}

	res.status(200).json(formatCancel(engineResponse.data as Record<string, unknown>));
}
