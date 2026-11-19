import { Router } from "express";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
	claimDailyReward,
	claimStarterCredit,
	completeOnboarding,
	createDeposit,
	getTradeHistory,
	getUserData,
} from "../controllers/user";

export const userRouter = Router();

userRouter.get(
	"/users/me",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(getUserData),
);
userRouter.post(
	"/users/me/onboarding",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(completeOnboarding),
);
userRouter.post(
	"/users/me/starter-credit",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(claimStarterCredit),
);
userRouter.get(
	"/trades",
	requireAccess({ scopes: ["ORDER_READ"], allowUnverified: true }),
	asyncHandler(getTradeHistory),
);
userRouter.post("/deposits", requireAccess({ types: ["service"] }), asyncHandler(createDeposit));
userRouter.post(
	"/users/me/daily-credit",
	requireAccess({ types: ["session"] }),
	asyncHandler(claimDailyReward),
);
