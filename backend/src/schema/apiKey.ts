import { z } from "zod";
import { Scope } from "../../generated/prisma/enums";

const scopeValues = Object.values(Scope);

export const createKeySchema = z.object({
	label: z.string().trim().min(1).max(50),
	scopes: z.array(z.enum(scopeValues)).min(1).default([Scope.ORDER_READ]),
});
