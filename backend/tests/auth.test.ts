import { expect, mock, test } from "bun:test";
import { authenticate, hashSecret, secretsMatch } from "../src/middleware/auth";

function mockReq(headers: Record<string, string> = {}) {
	return {
		headers,
		header: (name: string) => headers[name.toLowerCase()],
	} as any;
}

function mockRes() {
	const res = {
		status: mock(() => res),
		json: mock(() => undefined),
		clearCookie: mock(() => res),
	} as any;
	return res;
}

test("API key secrets only match the stored hash", () => {
	const hash = hashSecret("correct-secret");

	expect(secretsMatch("correct-secret", hash)).toBe(true);
	expect(secretsMatch("wrong-secret", hash)).toBe(false);
	expect(secretsMatch("correct-secret", "malformed-hash")).toBe(false);
});

test("authenticate passes through anonymously when no credentials", async () => {
	const req = mockReq();
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(next).toHaveBeenCalled();
	expect(req.principal).toBeUndefined();
});

test("authenticate continues anonymously for invalid session cookies", async () => {
	const req = mockReq({ cookie: "better-auth.session_token=invalid-token" });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(next).toHaveBeenCalled();
	expect(req.principal).toBeUndefined();
});

test("authenticate returns 401 for malformed api key", async () => {
	const req = mockReq({ "x-api-key": "not-a-key" });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({
		error: { code: "INVALID_API_KEY", message: "Malformed API key" },
		requestId: expect.any(String),
	});
	expect(next).not.toHaveBeenCalled();
});
