import { afterAll, beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { EngineClient, streamIdAtLeast } from "../helpers/engine";
import { createTestUser } from "../helpers/users";
import { waitFor } from "../helpers/wait-for";
import { TestDatabase } from "../setup/database";

const engine = new EngineClient();
const database = new TestDatabase();

beforeAll(async () => {
	await engine.connect();
	await waitForSystemReady();
});

afterAll(async () => {
	await Promise.all([engine.close(), database.close()]);
});

test("worker persists a duplicate fill event only once", async () => {
	const buyer = await createTestUser("duplicate-fill-buyer");
	const seller = await createTestUser("duplicate-fill-seller");
	const fill = {
		id: crypto.randomUUID(),
		symbol: "ETH_USD",
		price: "12345",
		qty: "100",
		buyOrderId: crypto.randomUUID(),
		sellOrderId: crypto.randomUUID(),
		buyerId: buyer.id,
		sellerId: seller.id,
		isBuyerMaker: false,
		createdAt: Date.now(),
	};
	const record = {
		id: crypto.randomUUID(),
		type: "fill.created",
		version: 1,
		occurredAt: fill.createdAt,
		event: { type: "fill.created", fill },
	};

	const firstEventId = await engine.addEngineEvent(record);

	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, firstEventId),
		{ description: "worker first-fill checkpoint" },
	);

	const secondEventId = await engine.addEngineEvent(record);

	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, secondEventId),
		{ description: "worker duplicate-fill checkpoint" },
	);

	expect(await database.fillCount(fill.id)).toBe(1);
	expect(await database.fill(fill.id)).toEqual({
		id: fill.id,
		symbol: "ETH_USD",
		price: "12345",
		qty: "100",
		buyOrderId: fill.buyOrderId,
		sellOrderId: fill.sellOrderId,
		buyerId: buyer.id,
		sellerId: seller.id,
	});
});

test("worker skips deleted-user events without blocking valid projections", async () => {
	const user = await createTestUser("deleted-user-neighbor");
	const missingUserId = crypto.randomUUID();
	const occurredAt = Date.now();
	const orderId = crypto.randomUUID();
	const orderEventId = crypto.randomUUID();
	const balanceEventId = crypto.randomUUID();

	const orderRecord = {
		id: orderEventId,
		type: "order.created",
		version: 1,
		occurredAt,
		event: {
			type: "order.created",
			order: {
				id: orderId,
				userId: missingUserId,
				symbol: "BTC_USD",
				price: "10000",
				qty: "100",
				type: "LIMIT",
				side: "BUY",
				filledQty: "0",
				status: "OPEN",
				lockedAmount: "10000",
				spentAmount: "0",
				fills: [],
				averagePrice: null,
				createdAt: occurredAt,
			},
		},
	};
	const balanceRecord = {
		id: balanceEventId,
		type: "balance.changed",
		version: 1,
		occurredAt,
		event: {
			type: "balance.changed",
			userId: user.id,
			asset: "TEST",
			available: "500",
			locked: "0",
			deltaAvailable: "500",
			deltaLocked: "0",
			reason: "credited",
			referenceId: "deleted-user-neighbor",
			symbol: null,
			occurredAt,
		},
	};

	await engine.addEngineEvent(orderRecord);
	const lastEventId = await engine.addEngineEvent(balanceRecord);

	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, lastEventId),
		{ description: "worker checkpoint past deleted-user event" },
	);

	expect(await database.order(orderId)).toBeUndefined();
	expect(await database.balanceHistory(balanceEventId)).toMatchObject({
		id: balanceEventId,
		userId: user.id,
		asset: "TEST",
		available: "500",
		locked: "0",
		deltaAvailable: "500",
		deltaLocked: "0",
		reason: "credited",
	});
});

test("worker projects balance events into current state and history", async () => {
	const user = await createTestUser("balance-projection");
	const occurredAt = Date.now();
	const eventId = crypto.randomUUID();
	const record = {
		id: eventId,
		type: "balance.changed",
		version: 1,
		occurredAt,
		event: {
			type: "balance.changed",
			userId: user.id,
			asset: "TEST",
			available: "12345",
			locked: "67",
			deltaAvailable: "12345",
			deltaLocked: "67",
			reason: "credited",
			referenceId: "credit-test",
			symbol: null,
			occurredAt,
		},
	};

	const firstEventId = await engine.addEngineEvent(record);
	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, firstEventId),
		{ description: "worker first-balance checkpoint" },
	);

	expect(await database.balance(user.id, "TEST")).toEqual({
		userId: user.id,
		asset: "TEST",
		available: "12345",
		locked: "67",
	});
	expect(await database.balanceHistory(eventId)).toEqual({
		id: eventId,
		userId: user.id,
		asset: "TEST",
		available: "12345",
		locked: "67",
		deltaAvailable: "12345",
		deltaLocked: "67",
		reason: "credited",
		referenceId: "credit-test",
		symbol: null,
	});

	const secondEventId = await engine.addEngineEvent(record);
	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, secondEventId),
		{ description: "worker duplicate-balance checkpoint" },
	);

	expect(await database.balanceHistoryCount(eventId)).toBe(1);
	expect(await database.balance(user.id, "TEST")).toEqual({
		userId: user.id,
		asset: "TEST",
		available: "12345",
		locked: "67",
	});
});
