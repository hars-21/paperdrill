import { Router } from "express";
import { signin, signout, signup } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../utils/auth";
import { authLimiter } from "../utils/rateLimit";

export const authRouter = Router();

authRouter.post("/signup", authLimiter, asyncHandler(signup));
authRouter.post("/login", authLimiter, asyncHandler(signin));
authRouter.post("/logout", requireAuth, asyncHandler(signout));
