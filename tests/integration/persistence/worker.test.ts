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

test("worker projects fills into weighted-average positions and trade events", async () => {
	const buyer = await createTestUser("position-buyer");
	const seller = await createTestUser("position-seller");
	const seed = await createTestUser("position-seed");
	const seedAt = Date.now() - 1_000;
	const at = Date.now();

	const seedFill = {
		id: crypto.randomUUID(),
		symbol: "ETH_USD",
		price: "100000",
		qty: "5000",
		buyOrderId: crypto.randomUUID(),
		sellOrderId: crypto.randomUUID(),
		buyerId: seller.id,
		sellerId: seed.id,
		isBuyerMaker: false,
		createdAt: seedAt,
	};
	const fill = {
		id: crypto.randomUUID(),
		symbol: "ETH_USD",
		price: "200000",
		qty: "5000",
		buyOrderId: crypto.randomUUID(),
		sellOrderId: crypto.randomUUID(),
		buyerId: buyer.id,
		sellerId: seller.id,
		isBuyerMaker: false,
		createdAt: at,
	};

	await engine.addEngineEvent({
		id: crypto.randomUUID(),
		type: "fill.created",
		version: 1,
		occurredAt: seedAt,
		event: { type: "fill.created", fill: seedFill },
	});
	const fillRecord = {
		id: crypto.randomUUID(),
		type: "fill.created",
		version: 1,
		occurredAt: at,
		event: { type: "fill.created", fill },
	};
	const lastEventId = await engine.addEngineEvent(fillRecord);

	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, lastEventId),
		{ description: "worker position checkpoint" },
	);

	expect(await database.position(buyer.id, "ETH")).toMatchObject({
		userId: buyer.id,
		asset: "ETH",
		qty: "5000",
		costBasis: "1000000",
		realizedPnl: "0",
		lastBuyPrice: "200000",
		lastBuyQty: "5000",
		lastSellPrice: null,
		tradeCount: 1,
	});
	expect(await database.position(seller.id, "ETH")).toMatchObject({
		userId: seller.id,
		asset: "ETH",
		qty: "0",
		costBasis: "0",
		realizedPnl: "500000",
		lastBuyPrice: "100000",
		lastSellPrice: "200000",
		lastSellQty: "5000",
		tradeCount: 2,
	});

	expect(await database.positionEvent(fill.id, buyer.id)).toMatchObject({
		fillId: fill.id,
		userId: buyer.id,
		asset: "ETH",
		side: "BUY",
		price: "200000",
		qty: "5000",
		quoteAmount: "1000000",
		costBasisBefore: "0",
		costBasisAfter: "1000000",
		realizedPnl: "0",
	});
	expect(await database.positionEvent(fill.id, seller.id)).toMatchObject({
		fillId: fill.id,
		userId: seller.id,
		asset: "ETH",
		side: "SELL",
		price: "200000",
		qty: "5000",
		quoteAmount: "1000000",
		costBasisBefore: "500000",
		costBasisAfter: "0",
		realizedPnl: "500000",
	});

	const snapshotPayload = await waitFor(
		() => engine.redis.get(`portfolio:snapshot:${buyer.id}`),
		(value) => {
			if (!value) return false;
			const snapshot = JSON.parse(value);
			return snapshot.positions?.some(
				(position: { asset: string; qty: string }) =>
					position.asset === "ETH" && position.qty === "5000",
			);
		},
		{ description: "buyer portfolio snapshot", timeoutMs: 15000 },
	);
	const snapshot = JSON.parse(snapshotPayload!);

	expect(snapshot).toMatchObject({ userId: buyer.id, quoteAsset: "USD" });
	expect(
		snapshot.positions.find((position: { asset: string }) => position.asset === "ETH"),
	).toMatchObject({
		qty: "5000",
		costBasis: "1000000",
		averageCost: "200000",
		tradeCount: 1,
	});

	const persistedSnapshot = await waitFor(
		() => database.portfolioSnapshot(buyer.id),
		(row) => row != null,
		{ description: "persisted buyer portfolio snapshot", timeoutMs: 15000 },
	);

	expect(persistedSnapshot).toMatchObject({
		userId: buyer.id,
		quoteAsset: "USD",
		netContributions: "1000000",
		partial: false,
	});

	const duplicateEventId = await engine.addEngineEvent(fillRecord);
	await waitFor(
		() => engine.redis.get("worker:event:last_id"),
		(cursor) => streamIdAtLeast(cursor, duplicateEventId),
		{ description: "worker duplicate-fill position checkpoint" },
	);

	expect(await database.position(buyer.id, "ETH")).toMatchObject({
		qty: "5000",
		costBasis: "1000000",
		realizedPnl: "0",
		tradeCount: 1,
	});
	expect(await database.positionEventCount(fill.id, buyer.id)).toBe(1);
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
