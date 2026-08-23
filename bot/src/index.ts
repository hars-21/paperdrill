import { sleep } from "bun";
import { signin, getOpenOrders, placeOrder, cancelOrder, getMarkets } from "./client";
import { config } from "./config";
import { getMidPrice } from "./price";
import { generateOrders } from "./strategy";
import { log, randomInt, shuffle } from "./util";

await signin();
await initMarket();
log("Signed in, starting bot");

for (;;) {
	try {
		const midPrice = await getMidPrice();
		if (!midPrice) {
			log("No price available, skipping cycle");
			await sleep(5000);
			continue;
		}

		const open = await getOpenOrders();
		const bids = open.filter((o) => o.side === "BUY");
		const asks = open.filter((o) => o.side === "SELL");

		if (bids.length === 0 || asks.length === 0) {
			await seed(midPrice);
		} else {
			await maintain(midPrice);
		}
	} catch (e) {
		log(`Cycle error: ${e}`);
	}

	const [min, max] = config.cycleIntervalMs as [number, number];
	await sleep(randomInt(min, max));
}

async function initMarket() {
	const markets = await getMarkets();
	const market = markets.find((m: any) => m.symbol === config.market);

	if (!market) throw new Error(`Market ${config.market} not found`);

	config.pricePrecision = market.pricePrecision;
	config.qtyPrecision = market.qtyPrecision;
}

async function seed(midPrice: number) {
	const orders = generateOrders(midPrice);

	let placed = 0;
	for (const o of orders) {
		try {
			await placeOrder(o.side, "LIMIT", o.price, o.qty);
			placed++;
		} catch (e) {
			log(`Seed order failed: ${e}`);
		}
	}
	log(`Seeded ${placed} orders`);
}

async function maintain(midPrice: number) {
	const open = await getOpenOrders();
	const bids = open.filter((o) => o.side === "BUY");
	const asks = open.filter((o) => o.side === "SELL");

	const cancelCount = randomInt(1, 3);

	const bidsToCancel = shuffle(bids).slice(0, cancelCount);
	const asksToCancel = shuffle(asks).slice(0, cancelCount);

	for (const o of bidsToCancel) {
		try {
			await cancelOrder(o.id);
		} catch {
			log(`Failed to cancel bid order ${o.id}`);
		}
	}

	for (const o of asksToCancel) {
		try {
			await cancelOrder(o.id);
		} catch {
			log(`Failed to cancel ask order ${o.id}`);
		}
	}

	const newOpen = await getOpenOrders();
	const openBids = newOpen.filter((o) => o.side === "BUY");
	const openAsks = newOpen.filter((o) => o.side === "SELL");

	const needBids = config.depthPerSide - openBids.length;
	const needAsks = config.depthPerSide - openAsks.length;

	if (needBids > 0 || needAsks > 0) {
		const orders = generateOrders(midPrice);

		for (const o of orders) {
			try {
				await placeOrder(o.side, "LIMIT", o.price, o.qty);
			} catch {
				log(`Failed to place order: ${o.side} ${o.price} ${o.qty}`);
			}
		}
	}

	log(
		`Book: ${openBids.length} bids, ${openAsks.length} asks | Cancelled ${bidsToCancel.length} bids, ${asksToCancel.length} asks`,
	);
}
