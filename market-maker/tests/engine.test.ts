import { expect, test } from "bun:test";
import {
	buildCancelOrderPayload,
	buildCommandEnvelope,
	buildCreateOrderPayload,
	buildDepositPayload,
	createCommandWriter,
} from "../src/engine";

const writerConfig = {
	incomingStream: "backend-to-engine-broker",
	incomingStreamMaxLen: 50_000,
	responseQueuePrefix: "response-queue-mm-",
};

test("create_order payload matches the engine's scaled integer contract", () => {
	expect(
		buildCreateOrderPayload({
			id: "order-1",
			userId: "user-1",
			symbol: "BTC_USD",
			side: "BUY",
			priceScaled: 6_750_025n,
			qtyScaled: 2_500n,
		}),
	).toEqual({
		id: "order-1",
		userId: "user-1",
		type: "LIMIT",
		side: "BUY",
		symbol: "BTC_USD",
		price: "6750025",
		qty: "2500",
	});
});

test("cancel_order and create_deposit payloads match engine schemas", () => {
	expect(buildCancelOrderPayload({ userId: "user-1", id: "order-1" })).toEqual({
		userId: "user-1",
		id: "order-1",
	});
	expect(buildDepositPayload({ userId: "user-1", asset: "USD", amountScaled: 100_00n })).toEqual({
		userId: "user-1",
		asset: "USD",
		amount: "10000",
	});
});

test("non-positive scaled values and empty identifiers are rejected locally", () => {
	expect(() =>
		buildCreateOrderPayload({
			id: "order-1",
			userId: "user-1",
			symbol: "BTC_USD",
			side: "SELL",
			priceScaled: 0n,
			qtyScaled: 1n,
		}),
	).toThrow("price must be a positive scaled integer");
	expect(() =>
		buildDepositPayload({ userId: "user-1", asset: "USD", amountScaled: -1n }),
	).toThrow("amount must be a positive scaled integer");
	expect(() => buildCancelOrderPayload({ userId: "", id: "order-1" })).toThrow("userId");
});

test("every command gets a fresh, unconsumed response queue", () => {
	const first = buildCommandEnvelope("cancel_order", { id: "1", userId: "u" }, writerConfig);
	const second = buildCommandEnvelope("cancel_order", { id: "1", userId: "u" }, writerConfig);

	expect(first.correlationId).not.toBe(second.correlationId);
	expect(first.responseQueue).toBe(`response-queue-mm-${first.correlationId}`);
	expect(second.responseQueue).toBe(`response-queue-mm-${second.correlationId}`);
	expect(JSON.parse(first.payload)).toEqual({ id: "1", userId: "u" });
});

test("writer appends to the broker stream with a capped MAXLEN", async () => {
	const xAdd = async (...args: unknown[]) => {
		calls.push(args);
		return "1-0";
	};
	const calls: unknown[][] = [];
	const writer = createCommandWriter({ xAdd } as never, writerConfig);

	await writer.cancelOrder({ userId: "user-1", id: "order-1" });

	expect(calls).toHaveLength(1);
	expect(calls[0]?.[0]).toBe(writerConfig.incomingStream);
	expect(calls[0]?.[1]).toBe("*");
	expect(calls[0]?.[3]).toEqual({
		TRIM: { strategy: "MAXLEN", strategyModifier: "~", threshold: 50_000 },
	});
});
