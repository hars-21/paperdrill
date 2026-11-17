import { z } from "zod";

export const portfolioHistoryQuerySchema = z.object({
	range: z.enum(["24h", "7d", "30d", "90d", "all"]).optional(),
	limit: z.coerce.number().int().min(10).max(5000).optional(),
});

export const positionAssetParamSchema = z.object({
	asset: z
		.string()
		.trim()
		.min(1, "asset is required")
		.transform((value) => value.toUpperCase()),
});

export const positionEventQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});
