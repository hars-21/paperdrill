import type { RedisClientType } from "redis";

export type OrderSide = "BUY" | "SELL";
export type EngineCommandType = "create_order" | "cancel_order" | "create_deposit";

export interface EngineWriterConfig {
	incomingStream: string;
	incomingStreamMaxLen: number;
	responseQueuePrefix: string;
}

export interface CreateOrderInput {
	id: string;
	userId: string;
	symbol: string;
	side: OrderSide;
	priceScaled: bigint;
	qtyScaled: bigint;
}

export interface CancelOrderInput {
	userId: string;
	id: string;
}

export interface DepositInput {
	userId: string;
	asset: string;
	amountScaled: bigint;
}

function assertPositive(field: string, value: bigint) {
	if (value <= 0n) throw new Error(`${field} must be a positive scaled integer`);
}

function assertRequired(field: string, value: string) {
	if (!value.trim()) throw new Error(`${field} is required`);
}

export function buildCreateOrderPayload(input: CreateOrderInput): Record<string, string> {
	assertRequired("id", input.id);
	assertRequired("userId", input.userId);
	assertRequired("symbol", input.symbol);
	assertPositive("price", input.priceScaled);
	assertPositive("qty", input.qtyScaled);

	return {
		id: input.id,
		userId: input.userId,
		type: "LIMIT",
		side: input.side,
		symbol: input.symbol,
		price: input.priceScaled.toString(),
		qty: input.qtyScaled.toString(),
	};
}

export function buildCancelOrderPayload(input: CancelOrderInput): Record<string, string> {
	assertRequired("userId", input.userId);
	assertRequired("id", input.id);
	return { userId: input.userId, id: input.id };
}

export function buildDepositPayload(input: DepositInput): Record<string, string> {
	assertRequired("userId", input.userId);
	assertRequired("asset", input.asset);
	assertPositive("amount", input.amountScaled);
	return {
		userId: input.userId,
		asset: input.asset,
		amount: input.amountScaled.toString(),
	};
}

export function buildCommandEnvelope(
	type: EngineCommandType,
	payload: Record<string, string>,
	writerConfig: Pick<EngineWriterConfig, "responseQueuePrefix">,
	correlationId = crypto.randomUUID(),
) {
	assertRequired("correlationId", correlationId);

	return {
		correlationId,
		// Unique and never consumed. The engine LPUSH+EXPIREs it, so ignored
		// responses self-clean instead of forming an unbounded shared list.
		responseQueue: `${writerConfig.responseQueuePrefix}${correlationId}`,
		type,
		payload: JSON.stringify(payload),
	};
}

export function createCommandWriter(
	client: Pick<RedisClientType, "xAdd">,
	writerConfig: EngineWriterConfig,
) {
	function write(type: EngineCommandType, payload: Record<string, string>) {
		const envelope = buildCommandEnvelope(type, payload, writerConfig);
		return client.xAdd(writerConfig.incomingStream, "*", envelope, {
			TRIM: {
				strategy: "MAXLEN",
				strategyModifier: "~",
				threshold: writerConfig.incomingStreamMaxLen,
			},
		});
	}

	return {
		createOrder(input: CreateOrderInput) {
			return write("create_order", buildCreateOrderPayload(input));
		},
		cancelOrder(input: CancelOrderInput) {
			return write("cancel_order", buildCancelOrderPayload(input));
		},
		deposit(input: DepositInput) {
			return write("create_deposit", buildDepositPayload(input));
		},
	};
}

export type CommandWriter = ReturnType<typeof createCommandWriter>;
