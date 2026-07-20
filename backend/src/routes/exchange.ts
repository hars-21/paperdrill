import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
	getOpenOrders,
	createOrder,
	getOrderById,
	cancelOrder,
	getOrders,
} from "../controllers/order";
import { getMarkets, getDepth, getTrades, getCandles } from "../controllers/market";
import { getBalance } from "../controllers/exchange";

export const exchangeRouter = Router();

// Orders
exchangeRouter.get("/orders", requireAuth, asyncHandler(getOrders));
exchangeRouter.get("/orders/open", requireAuth, asyncHandler(getOpenOrders));
exchangeRouter.post("/orders", requireAuth, asyncHandler(createOrder));
exchangeRouter.get("/orders/:orderId", requireAuth, asyncHandler(getOrderById));
exchangeRouter.delete("/orders/:orderId", requireAuth, asyncHandler(cancelOrder));

// Markets
exchangeRouter.get("/markets", asyncHandler(getMarkets));
exchangeRouter.get("/markets/:symbol/depth", asyncHandler(getDepth));
exchangeRouter.get("/markets/:symbol/trades", asyncHandler(getTrades));
exchangeRouter.get("/markets/:symbol/candles", asyncHandler(getCandles));

// Balances
exchangeRouter.get("/balances", requireAuth, asyncHandler(getBalance));
