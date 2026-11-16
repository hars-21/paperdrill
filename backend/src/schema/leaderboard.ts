import z from "zod";

export const leaderboardRangeSchema = z.enum(["24h", "7d", "30d", "all"]);

export const leaderboardQuerySchema = z.object({
	range: leaderboardRangeSchema.optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const leaderboardMeQuerySchema = z.object({
	range: leaderboardRangeSchema.optional(),
});
