import { Router } from "express";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
	getOpenOrders,
	createOrder,
	getOrderById,
	cancelOrder,
	getOrders,
} from "../controllers/order";
import { orderLimiter } from "../middleware/rateLimit";

export const orderRouter = Router();

orderRouter.get(
	"/",
	requireAccess({ scopes: ["ORDER_READ"], allowUnverified: true }),
	asyncHandler(getOrders),
);
orderRouter.get(
	"/open",
	requireAccess({ scopes: ["ORDER_READ"], allowUnverified: true }),
	asyncHandler(getOpenOrders),
);
orderRouter.get(
	"/:orderId",
	requireAccess({ scopes: ["ORDER_READ"], allowUnverified: true }),
	asyncHandler(getOrderById),
);
orderRouter.post(
	"/",
	requireAccess({ scopes: ["ORDER_CREATE"] }),
	orderLimiter,
	asyncHandler(createOrder),
);
orderRouter.delete(
	"/:orderId",
	requireAccess({ scopes: ["ORDER_CANCEL"] }),
	orderLimiter,
	asyncHandler(cancelOrder),
);
