import { expect, test, mock } from "bun:test";
import jwt from "jsonwebtoken";
import { authenticate, createToken, hashSecret, secretsMatch } from "../src/middleware/auth";
import { config } from "../src/config";

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

test("authenticate clears an invalid session cookie and continues anonymously", async () => {
	const req = mockReq({ cookie: "token=invalid-token" });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(res.clearCookie).toHaveBeenCalledWith("token", expect.any(Object));
	expect(next).toHaveBeenCalled();
	expect(req.principal).toBeUndefined();
});

test("authenticate clears an expired session cookie and continues anonymously", async () => {
	const token = jwt.sign({ id: "user-1" }, config.auth.jwtSecret, { expiresIn: -1 });
	const req = mockReq({ cookie: `token=${token}` });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(res.clearCookie).toHaveBeenCalledWith("token", expect.any(Object));
	expect(next).toHaveBeenCalled();
	expect(req.principal).toBeUndefined();
});

test("authenticate sets session principal for valid cookie", async () => {
	const token = createToken({ id: "user-1" });
	const req = mockReq({ cookie: `token=${token}` });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(next).toHaveBeenCalled();
	expect(req.principal).toEqual({ type: "session", userId: "user-1" });
});

test("authenticate returns 401 for malformed api key", async () => {
	const req = mockReq({ "x-api-key": "not-a-key" });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({ error: "Malformed API key" });
	expect(next).not.toHaveBeenCalled();
});
