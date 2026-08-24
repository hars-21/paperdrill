import z from "zod";

const decimalString = z
	.string()
	.trim()
	.regex(/^\d+(\.\d+)?$/, "invalid decimal format");

export const symbolParamSchema = z.object({
	symbol: z.string().trim().min(1, "symbol is required"),
});

export const orderIdParamSchema = z.object({
	orderId: z.string().trim().min(1, "orderId is required"),
});

export const statusQuerySchema = z.object({
	status: z.enum(["OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"]).optional(),
});

export const orderBodySchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("LIMIT"),
		side: z.enum(["BUY", "SELL"]),
		symbol: z.string().trim().min(1, "symbol is required"),
		price: decimalString,
		qty: decimalString,
	}),
	z.object({
		type: z.literal("MARKET"),
		side: z.enum(["BUY", "SELL"]),
		symbol: z.string().trim().min(1, "symbol is required"),
		qty: decimalString,
	}),
]);

export const candleQuerySchema = z.object({
	interval: z.enum(["15M", "1H", "4H", "1D"]).optional(),
});

export const orderQuerySchema = z.object({
	symbol: z.string().trim().optional(),
	status: z.enum(["OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"]).optional(),
	limit: z.coerce.number().int().positive().optional(),
	page: z.coerce.number().int().positive().optional(),
});

export const tradesQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(500).optional(),
});
