import { beforeAll, expect, test } from "bun:test";
import { publicApi, waitForSystemReady } from "../helpers/api";

beforeAll(waitForSystemReady);

test("root exposes the public API contract", async () => {
	const response = await publicApi.request<Record<string, unknown>>("/");

	expect(response).toMatchObject({
		status: 200,
		data: {
			message: "Welcome to PaperDrill",
			status: "running",
			success: true,
		},
	});
});

test("validation failures use the public JSON error contract", async () => {
	const response = await publicApi.request<{
		error: string;
		issues: Array<{ path: string }>;
	}>("/v1/auth/login", {
		method: "POST",
		body: JSON.stringify({ email: "not-an-email", password: "" }),
	});

	expect(response.status).toBe(400);
	expect(response.data.error).toBe("validation_error");
	expect(response.data.issues).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ path: "email" }),
			expect.objectContaining({ path: "password" }),
		]),
	);
});

test("anonymous users cannot access account or order operations", async () => {
	const balance = await publicApi.request<{ error: string }>("/v1/balances");
	const order = await publicApi.request<{ error: string }>("/v1/orders", {
		method: "POST",
		body: JSON.stringify({
			type: "LIMIT",
			side: "BUY",
			symbol: "BTC_USD",
			price: "100.00",
			qty: "0.1000",
		}),
	});

	for (const response of [balance, order]) {
		expect(response).toMatchObject({
			status: 401,
			data: { error: "Authentication required" },
		});
	}
});

test("malformed API keys are rejected before protected handlers run", async () => {
	const response = await publicApi.request<{ error: string }>("/v1/balances", {
		headers: { "x-api-key": "not-a-paperdrill-key" },
	});

	expect(response).toMatchObject({ status: 401, data: { error: "Malformed API key" } });
});

test("invalid session cookies are cleared and cannot authorize a request", async () => {
	const response = await publicApi.request<{ error: string }>("/v1/balances", {
		headers: { cookie: "token=invalid-token" },
	});

	expect(response).toMatchObject({ status: 401, data: { error: "Authentication required" } });
	expect(response.headers.get("set-cookie")).toContain("token=");
});

test("browser clients receive credentialed CORS preflight headers", async () => {
	const response = await fetch(`${process.env.API_BASE_URL}/v1/auth/login`, {
		method: "OPTIONS",
		headers: {
			origin: "http://localhost:3000",
			"access-control-request-method": "POST",
		},
	});

	expect(response.status).toBe(200);
	expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
	expect(response.headers.get("access-control-allow-credentials")).toBe("true");
});
