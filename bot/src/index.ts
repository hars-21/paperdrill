import { sleep } from "bun";
import { getOpenOrders, placeOrder, cancelOrder, initMarket, depositFunds } from "./client";
import { config } from "./config";
import { getMidPrice } from "./price";
import { generateOrders } from "./strategy";
import { log, randomInt, shuffle } from "./util";

await initMarket();

const [baseAsset, quoteAsset] = config.market.split("_") as [string, string];
const depositAmount = "1000000";

async function ensureFunds() {
	const basebalance = await depositFunds(depositAmount, baseAsset);
	const quoteBalance = await depositFunds(depositAmount, quoteAsset);
	log(`Deposited ${depositAmount} ${baseAsset} and ${depositAmount} ${quoteAsset}`);
	log(`Updated ${baseAsset} balance: ${basebalance[baseAsset]?.available}`);
	log(`Updated ${quoteAsset} balance: ${quoteBalance[quoteAsset]?.available}`);
}

await ensureFunds();

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

async function seed(midPrice: number) {
	const orders = generateOrders(midPrice);

	let placed = 0;
	for (const o of orders) {
		try {
			await placeOrder(o.side, "LIMIT", o.price, o.qty);
			placed++;
		} catch (e) {
			const msg = String(e);
			if (msg.includes("Insufficient balance")) {
				log("Insufficient balance, re-depositing funds");
				await ensureFunds();
				try {
					await placeOrder(o.side, "LIMIT", o.price, o.qty);
					placed++;
				} catch (e2) {
					log(`Seed order failed after re-deposit: ${e2}`);
				}
			} else {
				log(`Seed order failed: ${e}`);
			}
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
