import { afterAll, beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { EngineClient } from "../helpers/engine";
import { createTestUser } from "../helpers/users";

const engine = new EngineClient();

beforeAll(async () => {
	await engine.connect();
	await waitForSystemReady();
});

afterAll(() => engine.close());

test("backend writes complete place and cancel commands to the Redis broker", async () => {
	const user = await createTestUser("backend-redis");
	const created = await user.client.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "BTC_USD",
		price: "123.45",
		qty: "0.2500",
	});

	expect(created).toMatchObject({ status: 200, data: { status: "OPEN" } });

	const placeCommand = await engine.findBrokerCommand(
		"create_order",
		(payload) => payload.id === created.data.id,
	);
	expect(typeof placeCommand.correlationId).toBe("string");
	expect(placeCommand.responseQueue).toMatch(/^response-queue-/);
	expect(placeCommand.payload).toEqual({
		id: created.data.id,
		userId: user.id,
		type: "LIMIT",
		side: "BUY",
		symbol: "BTC_USD",
		price: "12345",
		qty: "2500",
	});

	const cancelled = await user.client.cancelOrder(created.data.id);
	expect(cancelled).toMatchObject({ status: 200, data: { id: created.data.id } });

	const cancelCommand = await engine.findBrokerCommand(
		"cancel_order",
		(payload) => payload.id === created.data.id,
	);
	expect(typeof cancelCommand.correlationId).toBe("string");
	expect(cancelCommand.responseQueue).toMatch(/^response-queue-/);
	expect(cancelCommand.payload).toEqual({ userId: user.id, id: created.data.id });
});

test("engine consumes a real Redis order command and returns a correlated response", async () => {
	const user = await createTestUser("redis-engine");
	const orderId = crypto.randomUUID();
	const result = await engine.request<Record<string, unknown>>("create_order", {
		id: orderId,
		userId: user.id,
		type: "LIMIT",
		side: "BUY",
		symbol: "SOL_USD",
		price: "100",
		qty: "100",
	});

	expect(result.response).toMatchObject({
		correlationId: result.correlationId,
		success: true,
		data: { id: orderId, symbol: "SOL_USD", status: "OPEN", filledQty: "0" },
	});
	expect(await user.client.getBalances()).toMatchObject({
		status: 200,
		data: { USD: { available: "9999.00", locked: "1.00" } },
	});

	await engine.command("cancel_order", { userId: user.id, id: orderId });
});
