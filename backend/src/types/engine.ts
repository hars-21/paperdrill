export type EngineCommandType =
	| "create_order"
	| "get_depth"
	| "get_user_balance"
	| "get_open_orders"
	| "get_trades"
	| "cancel_order";

export interface EngineRequest {
	correlationId: string;
	responseQueue: string;
	type: EngineCommandType;
	payload: Record<string, unknown>;
}

export interface EngineResponse {
	correlationId: string;
	success: boolean;
	data?: unknown;
	error?: string;
}
