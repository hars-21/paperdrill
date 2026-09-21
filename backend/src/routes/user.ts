import { Router } from "express";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
	claimDailyReward,
	createDeposit,
	getBalance,
	getPortfolio,
	getUserData,
	updateUserEmail,
} from "../controllers/user";
import { getTradeHistory } from "../controllers/user";
import { authLimiter } from "../middleware/rateLimit";

export const userRouter = Router();

userRouter.get(
	"/users/me",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(getUserData),
);
userRouter.patch(
	"/users/me/email",
	authLimiter,
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(updateUserEmail),
);
userRouter.get(
	"/trades",
	requireAccess({ scopes: ["ORDER_READ"], allowUnverified: true }),
	asyncHandler(getTradeHistory),
);
userRouter.get(
	"/balances",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getBalance),
);
userRouter.get(
	"/portfolio",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getPortfolio),
);
userRouter.post("/deposits", requireAccess({ types: ["service"] }), asyncHandler(createDeposit));
userRouter.post(
	"/users/me/daily-credit",
	requireAccess({ types: ["session"] }),
	asyncHandler(claimDailyReward),
);
