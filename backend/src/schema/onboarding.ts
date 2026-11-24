import { z } from "zod";

export const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, "Username must be at least 3 characters")
	.max(20, "Username must be 20 characters or less")
	.regex(/^[a-z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const completeOnboardingSchema = z.object({
	name: z.string().trim().min(1, "Display name is required").max(40, "Display name must be 40 characters or less"),
	username: usernameSchema,
});
