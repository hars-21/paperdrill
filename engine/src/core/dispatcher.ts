import type { EngineCommandType, EngineRequest } from "../types/request";
import { createOrderHandler } from "../handlers/createOrder";
import { cancelOrderHandler } from "../handlers/cancelOrder";
import { getDepthHandler } from "../handlers/getDepth";
import { getUserBalanceHandler } from "../handlers/getUserBalance";
import { getOpenOrdersHandler } from "../handlers/getOpenOrders";
import { getTradesHandler } from "../handlers/getTrades";
import { createDepositHandler } from "../handlers/createDeposit";

type EngineHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<EngineCommandType, EngineHandler> = {
	create_order: createOrderHandler,
	cancel_order: cancelOrderHandler,
	get_depth: getDepthHandler,
	get_user_balance: getUserBalanceHandler,
	get_open_orders: getOpenOrdersHandler,
	get_trades: getTradesHandler,
	create_deposit: createDepositHandler,
};

export async function dispatch(request: EngineRequest) {
	const handler = handlers[request.type];

	if (!handler) {
		throw new Error(`Unsupported engine command: ${request.type}`);
	}

	return handler(request.payload);
}
