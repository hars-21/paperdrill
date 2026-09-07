import { Router } from "express";
import { getLeaderboard, getMyLeaderboardEntry } from "../controllers/leaderboard";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", asyncHandler(getLeaderboard));
leaderboardRouter.get(
	"/me",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(getMyLeaderboardEntry),
);
