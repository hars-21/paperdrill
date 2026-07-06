import { Router } from "express";
import { getUserData, signin, signout, signup } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../utils/auth";

export const authRouter = Router();

authRouter.get("/me", requireAuth, asyncHandler(getUserData));
authRouter.post("/signup", asyncHandler(signup));
authRouter.post("/signin", asyncHandler(signin));
authRouter.post("/signout", asyncHandler(signout));
