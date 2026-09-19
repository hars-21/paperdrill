import { beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { EngineClient } from "../helpers/engine";
import { createTestUser, seedBalance, type TestUser } from "../helpers/users";
import { WebSocketProbe } from "../helpers/websocket";

beforeAll(waitForSystemReady);

test("a real orderbook change reaches depth subscribers in the public format", async () => {
	const probe = await WebSocketProbe.connect();
	const user = await createTestUser("websocket-depth");
	let orderId: string | undefined;

	try {
		await probe.subscribe("depth:ETH_USD");
		const depthMessage = probe.next<Record<string, unknown>>((message) => {
			if (typeof message !== "object" || message === null) return false;
			const event = message as { event?: string; symbol?: string; bids?: unknown[] };
			return (
				event.event === "depth" &&
				event.symbol === "ETH_USD" &&
				event.bids?.some(
					(level) =>
						typeof level === "object" &&
						level !== null &&
						"price" in level &&
						level.price === "123.45",
				) === true
			);
		}, "formatted ETH depth update");

		const created = await user.client.createOrder({
			type: "LIMIT",
			side: "BUY",
			symbol: "ETH_USD",
			price: "123.45",
			qty: "0.250",
		});
		expect(created).toMatchObject({ status: 201, data: { status: "OPEN" } });
		orderId = created.data.id;

		expect(await depthMessage).toMatchObject({
			event: "depth",
			symbol: "ETH_USD",
			bids: [{ price: "123.45", qty: "0.250" }],
			asks: [],
			lastUpdateId: expect.any(Number),
			timestamp: expect.any(Number),
		});
	} finally {
		if (orderId) await user.client.cancelOrder(orderId);
		probe.close();
	}
});

test("a real match reaches trade subscribers with formatted price and quantity", async () => {
	const probe = await WebSocketProbe.connect();
	const engine = new EngineClient();
	let seller: TestUser | undefined;
	let sellOrderId: string | undefined;

	try {
		await engine.connect();
		const buyer = await createTestUser("websocket-trade-buyer");
		seller = await createTestUser("websocket-trade-seller");
		await seedBalance(engine, seller.id, "ETH", "1000");
		await probe.subscribe("trade:ETH_USD");
		await probe.subscribe("candle:ETH_USD");

		const tradeMessage = probe.next<Record<string, unknown>>(
			(message) =>
				typeof message === "object" &&
				message !== null &&
				"event" in message &&
				message.event === "trade" &&
				"symbol" in message &&
				message.symbol === "ETH_USD",
			"ETH trade update",
		);
		const candleMessage = probe.next<Record<string, unknown>>(
			(message) =>
				typeof message === "object" &&
				message !== null &&
				"event" in message &&
				message.event === "candle" &&
				"symbol" in message &&
				message.symbol === "ETH_USD",
			"live ETH candle update",
		);

		const sell = await seller.client.createOrder({
			type: "LIMIT",
			side: "SELL",
			symbol: "ETH_USD",
			price: "321.00",
			qty: "0.250",
		});
		expect(sell).toMatchObject({ status: 201, data: { status: "OPEN" } });
		sellOrderId = sell.data.id;

		const buy = await buyer.client.createOrder({
			type: "LIMIT",
			side: "BUY",
			symbol: "ETH_USD",
			price: "321.00",
			qty: "0.250",
		});
		expect(buy).toMatchObject({ status: 201, data: { status: "FILLED" } });

		expect(await tradeMessage).toMatchObject({
			event: "trade",
			symbol: "ETH_USD",
			id: expect.any(String),
			price: "321.00",
			qty: "0.250",
			maker: false,
			timestamp: expect.any(Number),
		});
		expect(await candleMessage).toMatchObject({
			event: "candle",
			symbol: "ETH_USD",
			open: "321.00",
			high: "321.00",
			low: "321.00",
			close: "321.00",
			volume: "0.250",
			time: expect.any(Number),
		});
		sellOrderId = undefined;
	} finally {
		if (sellOrderId && seller) {
			await seller.client.cancelOrder(sellOrderId);
		}
		await engine.close();
		probe.close();
	}
});
