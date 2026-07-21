import fs from "fs/promises";
import { BALANCES, FILLS, ORDERBOOK, ORDERS } from "./store";
import type { OrderRecord, PriceLevel } from "./types/domain";
import { logger } from "./logger";
import { cacheClient } from "./redis/client";

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_PATH = "snapshots/snapshot.json";

function bigintReplacer(_key: string, value: unknown) {
	return typeof value === "bigint" ? { $bigint: value.toString() } : value;
}

function bigintReviver(_key: string, value: unknown) {
	if (value && typeof value === "object" && "$bigint" in value) {
		return BigInt((value as { $bigint: string }).$bigint);
	}
	return value;
}

export async function snapshot() {
	const jobsLastId = (await cacheClient.get("engine:jobs:last_id")) ?? "0-0";
	const ackLastId = (await cacheClient.get("engine:ack:last_id")) ?? "0-0";

	const snapshotData = {
		metadata: {
			version: SNAPSHOT_VERSION,
			snapshotAt: Date.now(),
			jobsLastId,
			ackLastId,
		},
		balances: { ...BALANCES },
		orderbook: {
			BTC_USD: {
				...ORDERBOOK.BTC_USD,
				bids: Object.fromEntries(new Map(ORDERBOOK.BTC_USD.bids)),
				asks: Object.fromEntries(new Map(ORDERBOOK.BTC_USD.asks)),
			},
			SOL_USD: {
				...ORDERBOOK.SOL_USD,
				bids: Object.fromEntries(new Map(ORDERBOOK.SOL_USD.bids)),
				asks: Object.fromEntries(new Map(ORDERBOOK.SOL_USD.asks)),
			},
			ETH_USD: {
				...ORDERBOOK.ETH_USD,
				bids: Object.fromEntries(new Map(ORDERBOOK.ETH_USD.bids)),
				asks: Object.fromEntries(new Map(ORDERBOOK.ETH_USD.asks)),
			},
		},
		fills: [...FILLS],
		orders: Object.fromEntries(ORDERS),
	};

	const tmpPath = `${SNAPSHOT_PATH}.tmp`;

	await fs.mkdir("snapshots", { recursive: true });
	await fs.writeFile(tmpPath, JSON.stringify(snapshotData, bigintReplacer, 2));
	await fs.rename(tmpPath, SNAPSHOT_PATH);
}

export async function loadSnapshot() {
	try {
		const data = await fs.readFile(SNAPSHOT_PATH, "utf-8");
		const parsed = JSON.parse(data, bigintReviver);

		if (parsed.metadata?.version !== SNAPSHOT_VERSION) {
			logger.error(
				`Snapshot version mismatch: expected ${SNAPSHOT_VERSION}, got ${parsed.metadata?.version}`,
			);
			return;
		}

		Object.assign(BALANCES, parsed.balances);

		for (const symbol of ["BTC_USD", "SOL_USD", "ETH_USD"] as const) {
			const saved = parsed.orderbook[symbol];
			if (!saved) continue;
			ORDERBOOK[symbol].bestBid = saved.bestBid;
			ORDERBOOK[symbol].bestAsk = saved.bestAsk;
			ORDERBOOK[symbol].bids = new Map(
				Object.entries(saved.bids).map(([k, v]) => [BigInt(k), v as PriceLevel]),
			);
			ORDERBOOK[symbol].asks = new Map(
				Object.entries(saved.asks).map(([k, v]) => [BigInt(k), v as PriceLevel]),
			);
		}

		FILLS.push(...parsed.fills);

		for (const [key, value] of Object.entries(parsed.orders)) {
			ORDERS.set(key, value as OrderRecord);
		}

		if (parsed.metadata) {
			await cacheClient.set("engine:jobs:last_id", parsed.metadata.jobsLastId);
			await cacheClient.set("engine:ack:last_id", parsed.metadata.ackLastId);
		}

		logger.info("Snapshot loaded", { metadata: parsed.metadata });
	} catch (err) {
		logger.error("Error loading snapshot:", err);
	}
}
