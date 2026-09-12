import { afterAll, beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { EngineClient } from "../helpers/engine";
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

	await engine.addStreamEvent("stream:fill", { event: "fill", fill });
	const secondEventId = await engine.addStreamEvent("stream:fill", { event: "fill", fill });

	await waitFor(
		() => engine.redis.get("worker:fill:last_id"),
		(cursor) => cursor === secondEventId,
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
