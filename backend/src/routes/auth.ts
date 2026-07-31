import { Router } from "express";
import { getUserData, signin, signout, signup } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../utils/auth";
import { authLimiter } from "../utils/rateLimit";

export const authRouter = Router();

authRouter.get("/me", requireAuth, asyncHandler(getUserData));
authRouter.post("/signup", authLimiter, asyncHandler(signup));
authRouter.post("/signin", authLimiter, asyncHandler(signin));
authRouter.post("/signout", asyncHandler(signout));
