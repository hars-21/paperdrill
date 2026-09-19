import { sleep } from "bun";
import {
	cancelOrder,
	depositFunds,
	getBalances,
	getOpenOrders,
	initMarket,
	placeOrder,
	MARKET,
} from "./client";
import { config } from "./config";
import { getMidPrice } from "./price";
import { generateOrders } from "./strategy";
import { log, randomInt, shuffle } from "./util";

await initMarket();
await cleanOpenOrders();

const [baseAsset, quoteAsset] = config.market.split("_") as [string, string];

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

		if (bids.length === 0 && asks.length === 0) {
			await seed(midPrice);
		} else if (bids.length === 0 || asks.length === 0) {
			await resetBook(midPrice, open);
		} else {
			await maintain(midPrice, bids, asks);
		}
	} catch (e) {
		log(`Cycle error: ${e}`);
	}

	const [min, max] = config.cycleIntervalMs as [number, number];
	await sleep(randomInt(min, max));
}

async function seed(midPrice: number) {
	await ensureFunds(midPrice);
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

async function ensureFunds(midPrice: number) {
	const balances = await getBalances();
	const baseTarget = config.maxOrderQty * config.depthPerSide;
	const quoteTarget = baseTarget * midPrice;

	await topUp(baseAsset, baseTarget, Number(balances[baseAsset]?.available ?? 0), MARKET.qtyPrecision);
	await topUp(
		quoteAsset,
		quoteTarget,
		Number(balances[quoteAsset]?.available ?? 0),
		MARKET.pricePrecision,
	);
}

async function topUp(asset: string, target: number, available: number, precision: number) {
	if (available >= target) return;
	const factor = 10 ** precision;
	const amount = BigInt(Math.ceil((target - available) * factor));
	if (amount <= 0n) return;

	await depositFunds(amount, asset);
	log(`Deposited ${(Number(amount) / factor).toFixed(precision)} ${asset}`);
}

async function cleanOpenOrders() {
	const orders = await getOpenOrders();
	for (const order of orders) {
		await cancelOrder(order.id);
	}
	log(`Cleaned ${orders.length} open orders on startup`);
}

async function resetBook(midPrice: number, orders: { id: string }[]) {
	for (const order of orders) {
		try {
			await cancelOrder(order.id);
		} catch {
			log(`Failed to cancel order ${order.id}; skipping seed`);
			return;
		}
	}

	await seed(midPrice);
}

async function maintain(
	midPrice: number,
	bids: { id: string; side: string }[],
	asks: { id: string; side: string }[],
) {
	const cancelCount = randomInt(1, 3);

	const bidsToCancel = shuffle(bids).slice(0, cancelCount);
	const asksToCancel = shuffle(asks).slice(0, cancelCount);
	let cancelledBids = 0;
	let cancelledAsks = 0;

	for (const o of bidsToCancel) {
		try {
			await cancelOrder(o.id);
			cancelledBids++;
		} catch {
			log(`Failed to cancel bid order ${o.id}`);
		}
	}

	for (const o of asksToCancel) {
		try {
			await cancelOrder(o.id);
			cancelledAsks++;
		} catch {
			log(`Failed to cancel ask order ${o.id}`);
		}
	}

	let needBids = Math.max(0, config.depthPerSide - (bids.length - cancelledBids));
	let needAsks = Math.max(0, config.depthPerSide - (asks.length - cancelledAsks));

	if (needBids > 0 || needAsks > 0) {
		const orders = generateOrders(midPrice);

		for (const o of orders) {
			if (o.side === "BUY" && needBids === 0) continue;
			if (o.side === "SELL" && needAsks === 0) continue;

			try {
				await placeOrder(o.side, "LIMIT", o.price, o.qty);
				if (o.side === "BUY") needBids--;
				else needAsks--;
			} catch {
				log(`Failed to place order: ${o.side} ${o.price} ${o.qty}`);
			}
		}
	}

	log(
		`Book: ${bids.length - cancelledBids} bids, ${asks.length - cancelledAsks} asks | Cancelled ${cancelledBids} bids, ${cancelledAsks} asks`,
	);
}
