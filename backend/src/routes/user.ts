import { Router } from "express";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { createDeposit, getBalance, getUserData } from "../controllers/user";

export const userRouter = Router();

userRouter.get("/users/me", requireAccess({ types: ["session"] }), asyncHandler(getUserData));
userRouter.get("/balances", requireAccess({ scopes: ["ACCOUNT_READ"] }), asyncHandler(getBalance));
userRouter.post("/deposits", requireAccess({ types: ["service"] }), asyncHandler(createDeposit));
