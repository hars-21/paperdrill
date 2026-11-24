import { Router } from "express";
import { claimReward, getRewards } from "../controllers/rewards";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const rewardsRouter = Router();

rewardsRouter.get(
	"/",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(getRewards),
);
rewardsRouter.post(
	"/:kind/claim",
	requireAccess({ types: ["session"], allowUnverified: true }),
	asyncHandler(claimReward),
);
