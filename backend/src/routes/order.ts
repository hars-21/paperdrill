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
import { orderLimiter } from "../utils/rateLimit";

export const orderRouter = Router();

orderRouter.get("/", requireAuth, asyncHandler(getOrders));
orderRouter.get("/open", requireAuth, asyncHandler(getOpenOrders));
orderRouter.get("/:orderId", requireAuth, asyncHandler(getOrderById));
orderRouter.post("/", requireAuth, orderLimiter, asyncHandler(createOrder));
orderRouter.delete("/:orderId", requireAuth, orderLimiter, asyncHandler(cancelOrder));
