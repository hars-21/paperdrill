import z from "zod";
import { config } from "../config";

export const orderPayloadSchema = z.discriminatedUnion("type", [
	z.object({
		id: z.string().trim().min(1, "id is required"),
		userId: z.string().trim().min(1, "userId is required"),
		type: z.literal("LIMIT"),
		side: z.enum(["BUY", "SELL"]),
		symbol: z.string().trim().min(1, "symbol is required"),
		price: z.coerce.bigint().positive("limit orders require a positive price"),
		qty: z.coerce.bigint().positive("qty must be a positive number"),
	}),
	z.object({
		id: z.string().trim().min(1, "id is required"),
		userId: z.string().trim().min(1, "userId is required"),
		type: z.literal("MARKET"),
		side: z.enum(["BUY", "SELL"]),
		symbol: z.string().trim().min(1, "symbol is required"),
		price: z.null(),
		qty: z.coerce.bigint().positive("qty must be a positive number"),
	}),
]);

export const symbolPayloadSchema = z.object({
	symbol: z.string().trim().min(1, "symbol is required"),
});

export const userPayloadSchema = z.object({
	userId: z.string().trim().min(1, "userId is required"),
});

export const orderIdPayloadSchema = z.object({
	userId: z.string().trim().min(1, "userId is required"),
	id: z.string().trim().min(1, "id is required"),
});

export const tradesPayloadSchema = symbolPayloadSchema.extend({
	limit: z.coerce.number().positive().max(config.recentTradesLimit).optional(),
});
