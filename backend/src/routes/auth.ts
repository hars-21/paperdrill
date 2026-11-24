import { Router } from "express";
import { createWebSocketTicket } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAccess } from "../middleware/auth";

export const authRouter = Router();

authRouter.post(
	"/ws-ticket",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(createWebSocketTicket),
);
