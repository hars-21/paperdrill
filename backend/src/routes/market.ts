import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getMarkets, getDepth, getTrades, getCandles } from "../controllers/market";

export const marketRouter = Router();

marketRouter.get("/", asyncHandler(getMarkets));
marketRouter.get("/:symbol/orderbook", asyncHandler(getDepth));
marketRouter.get("/:symbol/trades", asyncHandler(getTrades));
marketRouter.get("/:symbol/candles", asyncHandler(getCandles));
