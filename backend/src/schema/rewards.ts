import { z } from "zod";

export const rewardKindSchema = z.enum(["initial", "daily"]);

export const rewardClaimParamsSchema = z.object({
	kind: rewardKindSchema,
});
