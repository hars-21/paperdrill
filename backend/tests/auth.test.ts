import { expect, test, mock } from "bun:test";
import { createToken, authenticate } from "../src/middleware/auth";

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

test("createToken returns a valid JWT", () => {
	const token = createToken({ id: "user-1" });
	expect(typeof token).toBe("string");
	expect(token.split(".")).toHaveLength(3);
});

test("authenticate passes through anonymously when no credentials", async () => {
	const req = mockReq();
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(next).toHaveBeenCalled();
	expect(req.principal).toBeUndefined();
});

test("authenticate returns 401 for invalid session cookie", async () => {
	const req = mockReq({ cookie: "token=invalid-token" });
	const res = mockRes();
	const next = mock(() => undefined);

	await authenticate(req, res, next);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({ error: "Invalid auth token" });
	expect(next).not.toHaveBeenCalled();
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
