import type { Request, Response } from "express";
import { rewardClaimParamsSchema } from "../schema/rewards";
import { claimDailyCredit } from "../services/dailyCredit";
import { getRewardsSummary } from "../services/rewards";
import { claimInitialCredit } from "../services/starterCredit";
import { getUserId } from "../utils/principal";
import { sendValidationError } from "../utils/validation";

export async function getRewards(req: Request, res: Response) {
	const rewards = await getRewardsSummary(getUserId(req));
	res.status(200).json(rewards);
}

export async function claimInitialReward(req: Request, res: Response) {
	const reward = await claimInitialCredit(getUserId(req));
	res.status(200).json(reward);
}

export async function claimDailyReward(req: Request, res: Response) {
	const reward = await claimDailyCredit(getUserId(req));
	res.status(200).json(reward);
}

export async function claimReward(req: Request, res: Response) {
	const parsed = rewardClaimParamsSchema.safeParse(req.params);
	if (!parsed.success) {
		sendValidationError(res, parsed.error);
		return;
	}

	if (parsed.data.kind === "initial") {
		await claimInitialReward(req, res);
		return;
	}

	await claimDailyReward(req, res);
}
