import z from "zod";

export const orderPayloadSchema = z.discriminatedUnion("type", [
	z.object({
		orderId: z.string().trim().min(1, "orderId is required"),
		userId: z.string().trim().min(1, "userId is required"),
		type: z.literal("LIMIT"),
		side: z.enum(["BUY", "SELL"]),
		symbol: z.enum(["BTC_USD", "ETH_USD", "SOL_USD"]),
		price: z.coerce.bigint().positive("limit orders require a positive price"),
		qty: z.coerce.bigint().positive("qty must be a positive number"),
	}),
	z.object({
		orderId: z.string().trim().min(1, "orderId is required"),
		userId: z.string().trim().min(1, "userId is required"),
		type: z.literal("MARKET"),
		side: z.enum(["BUY", "SELL"]),
		symbol: z.enum(["BTC_USD", "ETH_USD", "SOL_USD"]),
		price: z.null(),
		qty: z.coerce.bigint().positive("qty must be a positive number"),
	}),
]);

export const symbolPayloadSchema = z.object({
	symbol: z.enum(["BTC_USD", "ETH_USD", "SOL_USD"]),
});

export const userPayloadSchema = z.object({
	userId: z.string().trim().min(1, "userId is required"),
});

export const orderIdPayloadSchema = z.object({
	userId: z.string().trim().min(1, "userId is required"),
	orderId: z.string().trim().min(1, "orderId is required"),
});

export const tradesPayloadSchema = z.object({
	symbol: z.string().trim().min(1, "symbol is required"),
	limit: z.coerce.number().int().positive().default(100),
});
