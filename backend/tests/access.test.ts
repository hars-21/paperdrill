import { expect, test, mock } from "bun:test";
import { requireAccess } from "../src/middleware/auth";
import type { Principal } from "../src/types/principal";

function run(principal: Principal | undefined, opts: Parameters<typeof requireAccess>[0]) {
	const req = { principal } as any;
	const res = {
		status: mock(() => res),
		json: mock(() => undefined),
	} as any;
	const next = mock(() => undefined);

	requireAccess(opts)(req, res, next);

	return { res, next };
}

const apiKeyPrincipal: Principal = {
	type: "api_key",
	userId: "user-1",
	keyId: "key-1",
	scopes: ["ACCOUNT_READ", "ORDER_CREATE"],
};

test("requireAccess rejects anonymous requests with 401", () => {
	const { res, next } = run(undefined, {});

	expect(res.status).toHaveBeenCalledWith(401);
	expect(next).not.toHaveBeenCalled();
});

test("requireAccess rejects disallowed principal types with 403", () => {
	const { res, next } = run(apiKeyPrincipal, { types: ["session"] });

	expect(res.status).toHaveBeenCalledWith(403);
	expect(next).not.toHaveBeenCalled();
});

test("requireAccess allows matching principal type", () => {
	const { res, next } = run(apiKeyPrincipal, { types: ["session", "api_key"] });

	expect(next).toHaveBeenCalled();
	expect(res.status).not.toHaveBeenCalled();
});

test("requireAccess lets sessions bypass scope checks", () => {
	const { res, next } = run({ type: "session", userId: "u" }, { scopes: ["ORDER_CANCEL"] });

	expect(next).toHaveBeenCalled();
	expect(res.status).not.toHaveBeenCalled();
});

test("requireAccess allows api keys holding all required scopes", () => {
	const { next } = run(apiKeyPrincipal, { scopes: ["ACCOUNT_READ", "ORDER_CREATE"] });

	expect(next).toHaveBeenCalled();
});

test("requireAccess rejects api keys missing a required scope", () => {
	const { res, next } = run(apiKeyPrincipal, { scopes: ["ACCOUNT_READ", "ORDER_CANCEL"] });

	expect(res.status).toHaveBeenCalledWith(403);
	expect(res.json).toHaveBeenCalledWith({
		error: "You do not have permission to perform this action",
	});
	expect(next).not.toHaveBeenCalled();
});

test("requireAccess rejects service principals on scoped user routes", () => {
	const { res, next } = run({ type: "service" }, { scopes: ["ACCOUNT_READ"] });

	expect(res.status).toHaveBeenCalledWith(403);
	expect(next).not.toHaveBeenCalled();
});
