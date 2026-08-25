import { Router } from "express";
import { resendVerificationEmail, signin, signout, signup, verifyEmail } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAccess } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/signup", authLimiter, asyncHandler(signup));
authRouter.post("/login", authLimiter, asyncHandler(signin));
authRouter.post("/logout", requireAccess({ types: ["session"] }), asyncHandler(signout));
authRouter.post("/verify-email", authLimiter, asyncHandler(verifyEmail));
authRouter.post("/resend-verification-email", authLimiter, asyncHandler(resendVerificationEmail));
