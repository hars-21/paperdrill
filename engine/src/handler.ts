import { getUserBalance } from "./balance";
import { cancelOrder, getFills, getOpenOrders, getOrder, placeOrder } from "./order";
import { getDepth } from "./orderbook";
import type { EngineCommandType, EngineRequest } from "./types/request";
import {
	orderIdPayloadSchema,
	orderPayloadSchema,
	symbolPayloadSchema,
	tradesPayloadSchema,
	userPayloadSchema,
} from "./types/order";

type Handler = (payload: Record<string, unknown>) => unknown | Promise<unknown>;

const handlers: Record<EngineCommandType, Handler> = {
	create_order: async (payload) => {
		const parsed = orderPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid order payload");
		return placeOrder(parsed.data);
	},

	get_depth: async (payload) => {
		const parsed = symbolPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid symbol");
		return getDepth(parsed.data.symbol);
	},

	get_user_balance: (payload) => {
		const parsed = userPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid userId");
		return getUserBalance(parsed.data.userId);
	},

	get_order: (payload) => {
		const parsed = orderIdPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid OrderId");
		return getOrder(parsed.data.userId, parsed.data.orderId);
	},

	get_open_orders: (payload) => {
		const parsed = userPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid userId");
		return getOpenOrders(parsed.data.userId);
	},

	get_trades: (payload) => {
		const parsed = tradesPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid trades payload");
		return getFills(parsed.data.symbol, parsed.data.limit);
	},

	cancel_order: async (payload) => {
		const parsed = orderIdPayloadSchema.safeParse(payload);
		if (!parsed.success) throw new Error("Invalid OrderId");
		return cancelOrder(parsed.data.userId, parsed.data.orderId);
	},
};

export async function handleEngineRequest(message: EngineRequest) {
	const handler = handlers[message.type];

	if (!handler) throw new Error("Unknown message type");

	return handler(message.payload);
}
