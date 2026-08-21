import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../utils/auth";
import { getBalance, getUserData } from "../controllers/user";

export const userRouter = Router();

userRouter.get("/users/me", requireAuth, asyncHandler(getUserData));
userRouter.get("/balances", requireAuth, asyncHandler(getBalance));
