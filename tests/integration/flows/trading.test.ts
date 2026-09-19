import { afterAll, beforeAll, expect, test } from "bun:test";
import { publicApi, waitForSystemReady } from "../helpers/api";
import { EngineClient } from "../helpers/engine";
import { createTestUser, seedBalance } from "../helpers/users";
import { waitFor } from "../helpers/wait-for";
import { TestDatabase, type PersistedOrder } from "../setup/database";

const engine = new EngineClient();
const database = new TestDatabase();

beforeAll(async () => {
	await engine.connect();
	await waitForSystemReady();
});

afterAll(async () => {
	await Promise.all([engine.close(), database.close()]);
});

function waitForOrder(id: string, status: PersistedOrder["status"]) {
	return waitFor(
		() => database.order(id),
		(order) => order?.status === status,
		{ description: `${id} to persist as ${status}` },
	);
}

test("a complete trade settles live balances and persists user-visible history", async () => {
	const buyer = await createTestUser("trade-buyer");
	const seller = await createTestUser("trade-seller");
	await seedBalance(engine, seller.id, "BTC", "10000");

	const sell = await seller.client.createOrder({
		type: "LIMIT",
		side: "SELL",
		symbol: "BTC_USD",
		price: "100.00",
		qty: "0.5000",
	});
	const buy = await buyer.client.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "BTC_USD",
		price: "100.00",
		qty: "0.5000",
	});

	expect(sell).toMatchObject({ status: 201, data: { status: "OPEN", filledQty: "0.0000" } });
	expect(buy).toMatchObject({
		status: 201,
		data: { status: "FILLED", filledQty: "0.5000", averagePrice: "100.00" },
	});
	expect(await buyer.client.getBalances()).toMatchObject({
		status: 200,
		data: {
			USD: { available: "9950.00", locked: "0.00" },
			BTC: { available: "0.5000", locked: "0.0000" },
		},
	});
	expect(await seller.client.getBalances()).toMatchObject({
		status: 200,
		data: {
			USD: { available: "10050.00", locked: "0.00" },
			BTC: { available: "0.5000", locked: "0.0000" },
		},
	});

	const [buyOrder, sellOrder] = await Promise.all([
		waitForOrder(buy.data.id, "FILLED"),
		waitForOrder(sell.data.id, "FILLED"),
	]);
	expect(buyOrder).toMatchObject({ userId: buyer.id, filledQty: "5000", spentAmount: "5000" });
	expect(sellOrder).toMatchObject({ userId: seller.id, filledQty: "5000" });

	const buyerHistory = await waitFor(
		() => buyer.client.getOrders(),
		(response) => response.status === 200 && response.data.some((order) => order.id === buy.data.id),
		{ description: "buyer order history" },
	);
	expect(buyerHistory.data).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: buy.data.id, status: "FILLED", filledQty: "0.5000" }),
		]),
	);
	expect(buyerHistory.data.some((order) => order.id === sell.data.id)).toBe(false);

	const buyerTrades = await waitFor(
		() => buyer.client.getTrades(),
		(response) => response.status === 200 && response.data.length === 1,
		{ description: "buyer fill history" },
	);
	const fillId = buyerTrades.data[0]?.id as string;
	expect(buyerTrades.data[0]).toMatchObject({
		symbol: "BTC_USD",
		price: "100.00",
		qty: "0.5000",
		side: "BUY",
		isMaker: false,
		orderId: buy.data.id,
	});
	expect(await database.fill(fillId)).toMatchObject({
		buyOrderId: buy.data.id,
		sellOrderId: sell.data.id,
		buyerId: buyer.id,
		sellerId: seller.id,
	});

	const ticker = await waitFor(
		() => publicApi.getTicker("BTC_USD"),
		(response) => response.status === 200 && response.data.lastPrice === "100.00",
		{ description: "worker-derived BTC ticker" },
	);
	expect(ticker.data).toMatchObject({
		symbol: "BTC_USD",
		lastPrice: "100.00",
		openPrice: "100.00",
		high: "100.00",
		low: "100.00",
		volume: "0.5000",
	});

	expect(await buyer.client.cancelOrder(buy.data.id)).toMatchObject({
		status: 409,
		data: {
			error: {
				code: "ORDER_NOT_CANCELLABLE",
				message: "Filled orders cannot be cancelled",
			},
		},
	});
});

test("a partial fill propagates through balances, open orders, fills, and persistence", async () => {
	const buyer = await createTestUser("partial-buyer");
	const seller = await createTestUser("partial-seller");
	await seedBalance(engine, seller.id, "SOL", "1000");

	const sell = await seller.client.createOrder({
		type: "LIMIT",
		side: "SELL",
		symbol: "SOL_USD",
		price: "100.00",
		qty: "10.00",
	});
	const buy = await buyer.client.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "SOL_USD",
		price: "100.00",
		qty: "4.00",
	});

	expect(buy).toMatchObject({ status: 201, data: { status: "FILLED", filledQty: "4.00" } });
	expect(await seller.client.getOpenOrders()).toMatchObject({
		status: 200,
		data: [
			expect.objectContaining({
				id: sell.data.id,
				status: "PARTIALLY_FILLED",
				qty: "10.00",
				filledQty: "4.00",
			}),
		],
	});
	expect(await buyer.client.getBalances()).toMatchObject({
		data: {
			USD: { available: "9600.00", locked: "0.00" },
			SOL: { available: "4.00", locked: "0.00" },
		},
	});
	expect(await seller.client.getBalances()).toMatchObject({
		data: {
			USD: { available: "10400.00", locked: "0.00" },
			SOL: { available: "0.00", locked: "6.00" },
		},
	});

	const [persistedSell, persistedBuy] = await Promise.all([
		waitForOrder(sell.data.id, "PARTIALLY_FILLED"),
		waitForOrder(buy.data.id, "FILLED"),
	]);
	expect(persistedSell).toMatchObject({ qty: "1000", filledQty: "400", status: "PARTIALLY_FILLED" });
	expect(persistedBuy).toMatchObject({ qty: "400", filledQty: "400", status: "FILLED" });

	const trades = await waitFor(
		() => seller.client.getTrades(),
		(response) => response.status === 200 && response.data.length === 1,
		{ description: "partial-fill trade persistence" },
	);
	expect(trades.data[0]).toMatchObject({ qty: "4.00", side: "SELL", orderId: sell.data.id });

	await seller.client.cancelOrder(sell.data.id);
});

test("cancelling an open order releases funds and persists ownership-safe state", async () => {
	const owner = await createTestUser("cancel-owner");
	const other = await createTestUser("cancel-other");
	const created = await owner.client.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "ETH_USD",
		price: "100.00",
		qty: "1.000",
	});

	expect(created).toMatchObject({ status: 201, data: { status: "OPEN" } });
	expect(await owner.client.getBalances()).toMatchObject({
		data: { USD: { available: "9900.00", locked: "100.00" } },
	});

	await waitForOrder(created.data.id, "OPEN");
	expect(await other.client.getOrder(created.data.id)).toMatchObject({
		status: 404,
		data: { error: { code: "ORDER_NOT_FOUND", message: "Order not found" } },
	});
	expect(await other.client.cancelOrder(created.data.id)).toMatchObject({
		status: 404,
		data: { error: { code: "ORDER_NOT_FOUND", message: "Order not found" } },
	});

	expect(await owner.client.cancelOrder(created.data.id)).toMatchObject({
		status: 200,
		data: { id: created.data.id, symbol: "ETH_USD", qty: "1.000", filledQty: "0.000" },
	});
	expect(await owner.client.getBalances()).toMatchObject({
		data: { USD: { available: "10000.00", locked: "0.00" } },
	});
	expect((await owner.client.getOpenOrders()).data.some((order) => order.id === created.data.id)).toBe(
		false,
	);
	expect(await waitForOrder(created.data.id, "CANCELLED")).toMatchObject({
		filledQty: "0",
		status: "CANCELLED",
	});

	expect(await owner.client.cancelOrder(created.data.id)).toMatchObject({
		status: 200,
		data: { message: "Order already cancelled" },
	});
});
