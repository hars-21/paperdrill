import { Router } from "express";
import {
	claimDailyReward,
	claimInitialReward,
} from "../controllers/rewards";
import { completeOnboarding, createDeposit, getTradeHistory, getUserData } from "../controllers/user";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

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
	asyncHandler(claimInitialReward),
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
