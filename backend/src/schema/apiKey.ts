import { z } from "zod";
import { Scope } from "../../generated/prisma/enums";

const scopeValues = Object.values(Scope);

export const createKeySchema = z.object({
	label: z.string().trim().min(1).max(50),
	scopes: z.array(z.enum(scopeValues)).min(1).default([Scope.ORDER_READ]),
});

export const balanceQuerySchema = z.object({
	asset: z
		.string()
		.regex(/^[A-Z][A-Z0-9_]{1,15}$/, "Invalid asset format")
		.optional(),
});
