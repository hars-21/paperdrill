import z from "zod";

export const leaderboardQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).max(10_000).optional(),
});
