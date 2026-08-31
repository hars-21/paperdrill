import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
	getMarkets,
	getDepth,
	getTrades,
	getCandles,
	getTicker,
	getTickers,
} from "../controllers/market";

export const marketRouter = Router();

marketRouter.get("/", asyncHandler(getMarkets));
marketRouter.get("/tickers", asyncHandler(getTickers));
marketRouter.get("/:symbol/orderbook", asyncHandler(getDepth));
marketRouter.get("/:symbol/trades", asyncHandler(getTrades));
marketRouter.get("/:symbol/candles", asyncHandler(getCandles));
marketRouter.get("/:symbol/ticker", asyncHandler(getTicker));
