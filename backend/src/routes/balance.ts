import { Router } from "express";
import { getBalance, getBalanceHistory, getBalanceHistorySeries } from "../controllers/balance";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const balanceRouter = Router();

balanceRouter.get(
	"/",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getBalance),
);
balanceRouter.get(
	"/history/series",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getBalanceHistorySeries),
);
balanceRouter.get(
	"/history",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getBalanceHistory),
);
