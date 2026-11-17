import { afterAll, beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { EngineClient } from "../helpers/engine";
import { createTestUser } from "../helpers/users";
import { WebSocketProbe } from "../helpers/websocket";

const engine = new EngineClient();

interface TicketResponse {
	ticket: string;
	expiresAt: string;
}

interface SubscribedMessage {
	type: string;
	channel: string;
}

interface AccountSnapshot {
	userId: string;
	equity: string;
}

beforeAll(async () => {
	await engine.connect();
	await waitForSystemReady();
});

afterAll(async () => {
	await engine.close();
});

test("a WebSocket ticket forwards only the owner's account snapshots", async () => {
	const owner = await createTestUser("ws-account-owner");
	const other = await createTestUser("ws-account-other");

	const ticket = await owner.client.request<TicketResponse>("/v1/auth/ws-ticket", {
		method: "POST",
	});
	expect(ticket.status).toBe(201);
	expect(ticket.data.ticket).toEqual(expect.any(String));
	expect(new Date(ticket.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

	const probe = await WebSocketProbe.connect(ticket.data.ticket);

	try {
		const subscribed = await probe.next<SubscribedMessage>(
			(message) =>
				typeof message === "object" &&
				message !== null &&
				"type" in message &&
				message.type === "subscribed",
			"account channel subscription",
		);
		expect(subscribed).toMatchObject({
			type: "subscribed",
			channel: `account:${owner.id}`,
		});

		const snapshot = probe.next<AccountSnapshot>(
			(message) =>
				typeof message === "object" &&
				message !== null &&
				"userId" in message &&
				message.userId === owner.id,
			"owner account snapshot",
		);

		await engine.redis.publish(
			`account:${owner.id}`,
			JSON.stringify({ userId: owner.id, equity: "10000.00" }),
		);
		await engine.redis.publish(
			`account:${other.id}`,
			JSON.stringify({ userId: other.id, equity: "10000.00" }),
		);

		expect(await snapshot).toMatchObject({ userId: owner.id, equity: "10000.00" });

		const forbidden = probe.next<{ error: string; channel: string }>(
			(message) =>
				typeof message === "object" &&
				message !== null &&
				"error" in message &&
				message.error === "SUBSCRIPTION_FORBIDDEN",
			"forbidden account subscription",
		);
		probe.socket.send(
			JSON.stringify({ method: "SUBSCRIBE", params: [`account:${other.id}`] }),
		);

		expect(await forbidden).toMatchObject({
			error: "SUBSCRIPTION_FORBIDDEN",
			channel: `account:${other.id}`,
		});
	} finally {
		probe.close();
	}
});
