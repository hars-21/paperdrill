import { beforeAll, expect, test } from "bun:test";
import { publicApi, waitForSystemReady } from "../helpers/api";
import { createTestUser } from "../helpers/users";

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
	const { client } = await createTestUser("validation-contract");
	const response = await client.request<{
		error: { code: string; message: string; details: Array<{ field: string }> };
		requestId: string;
	}>("/v1/users/me/onboarding", {
		method: "POST",
		body: JSON.stringify({ name: "", username: "BAD-NAME" }),
	});

	expect(response.status).toBe(400);
	expect(response.headers.get("x-request-id")).toBe(response.data.requestId);
	expect(response.data.error).toMatchObject({
		code: "VALIDATION_ERROR",
		message: "Request validation failed",
	});
	expect(response.data.error.details).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ field: "name" }),
			expect.objectContaining({ field: "username" }),
		]),
	);
});

test("anonymous users cannot access account or order operations", async () => {
	const balance = await publicApi.request<Record<string, unknown>>("/v1/balances");
	const order = await publicApi.request<Record<string, unknown>>("/v1/orders", {
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
			data: {
				error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
				requestId: expect.any(String),
			},
		});
	}
});

test("malformed API keys are rejected before protected handlers run", async () => {
	const response = await publicApi.request<Record<string, unknown>>("/v1/balances", {
		headers: { "x-api-key": "not-a-paperdrill-key" },
	});

	expect(response).toMatchObject({
		status: 401,
		data: { error: { code: "INVALID_API_KEY", message: "Malformed API key" } },
	});
});

test("invalid session cookies cannot authorize a request", async () => {
	const response = await publicApi.request<Record<string, unknown>>("/v1/balances", {
		headers: { cookie: "better-auth.session_token=invalid-token" },
	});

	expect(response).toMatchObject({
		status: 401,
		data: { error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } },
	});
});

test("malformed JSON and unknown routes return JSON errors", async () => {
	const malformed = await publicApi.request<Record<string, unknown>>("/v1/rewards/initial/claim", {
		method: "POST",
		body: "{not-json",
	});
	const missing = await publicApi.request<Record<string, unknown>>("/v1/does-not-exist");

	expect(malformed).toMatchObject({
		status: 400,
		data: { error: { code: "MALFORMED_JSON", message: "Request body contains invalid JSON" } },
	});
	expect(missing).toMatchObject({
		status: 404,
		data: { error: { code: "RESOURCE_NOT_FOUND" }, requestId: expect.any(String) },
	});
});

test("browser clients receive credentialed CORS preflight headers", async () => {
	const response = await fetch(`${process.env.API_BASE_URL}/v1/rewards/initial/claim`, {
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
