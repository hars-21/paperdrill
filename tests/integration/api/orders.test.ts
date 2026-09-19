import { beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { createTestUser } from "../helpers/users";

beforeAll(waitForSystemReady);

test("invalid orders are rejected without creating open state", async () => {
	const { client } = await createTestUser("validation");
	const invalidOrders = [
		{ type: "LIMIT", side: "BUY", price: "100.00", qty: "0.1000" },
		{ type: "LIMIT", side: "HOLD", symbol: "BTC_USD", price: "100.00", qty: "0.1000" },
		{ type: "STOP", side: "BUY", symbol: "BTC_USD", price: "100.00", qty: "0.1000" },
		{ type: "LIMIT", side: "BUY", symbol: "BTC_USD", qty: "0.1000" },
		{ type: "LIMIT", side: "BUY", symbol: "BTC_USD", price: "100.00", qty: "0" },
		{ type: "LIMIT", side: "BUY", symbol: "BTC_USD", price: "0", qty: "0.1000" },
		{ type: "LIMIT", side: "BUY", symbol: "DOGE_USD", price: "1.00", qty: "1" },
	];

	for (const order of invalidOrders) {
		const response = await client.request<Record<string, unknown>>("/v1/orders", {
			method: "POST",
			body: JSON.stringify(order),
		});
		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	}

	expect(await client.getOpenOrders()).toMatchObject({ status: 200, data: [] });
});

test("an account without base inventory cannot place a sell order", async () => {
	const { client } = await createTestUser("no-inventory");
	const response = await client.createOrder({
		type: "LIMIT",
		side: "SELL",
		symbol: "BTC_USD",
		price: "100.00",
		qty: "0.1000",
	});

	expect(response).toMatchObject({
		status: 422,
		data: { error: { code: "INSUFFICIENT_BALANCE", message: "Insufficient balance" } },
	});
	expect(await client.getOpenOrders()).toMatchObject({ status: 200, data: [] });
});
