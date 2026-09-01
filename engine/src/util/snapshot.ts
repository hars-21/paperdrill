import fs from "fs/promises";
import { BALANCES, ORDERBOOK, ORDERS, RECENT_TRADES } from "../store";
import type { Fill, InternalOrder, PriceLevel } from "../types/domain";
import { logger } from "./logger";
import { cacheClient } from "../redis/client";

const SNAPSHOT_VERSION = 3;
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

async function readSnapshotFile(path: string) {
	return fs.readFile(path, "utf-8").then((data) => JSON.parse(data, bigintReviver));
}

export async function snapshot() {
	const jobsLastId = (await cacheClient.get("engine:jobs:last_id")) ?? "0-0";

	const snapshotData = {
		metadata: {
			version: SNAPSHOT_VERSION,
			snapshotAt: Date.now(),
			jobsLastId,
		},
		balances: { ...BALANCES },
		orderbook: Object.fromEntries(
			Object.entries(ORDERBOOK).map(([symbol, market]) => [
				symbol,
				{
					bestBid: market.bestBid,
					bestAsk: market.bestAsk,
					bids: Object.fromEntries(market.bids),
					asks: Object.fromEntries(market.asks),
				},
			]),
		),
		recentTrades: RECENT_TRADES,
		orders: Object.fromEntries(ORDERS),
	};

	const tmpPath = `${SNAPSHOT_PATH}.tmp`;

	await fs.mkdir("snapshots", { recursive: true });
	await fs.writeFile(tmpPath, JSON.stringify(snapshotData, bigintReplacer));
	await fs.rename(tmpPath, SNAPSHOT_PATH);
}

export async function loadSnapshot() {
	try {
		const parsed = await readSnapshotFile(SNAPSHOT_PATH);

		if (parsed.metadata?.version !== SNAPSHOT_VERSION) {
			logger.error(
				`Snapshot version mismatch: expected ${SNAPSHOT_VERSION}, got ${parsed.metadata?.version}`,
			);
			return;
		}

		Object.assign(BALANCES, parsed.balances);

		for (const [symbol, market] of Object.entries(ORDERBOOK)) {
			const saved = parsed.orderbook?.[symbol];
			if (!saved) continue;
			market.bestBid = saved.bestBid;
			market.bestAsk = saved.bestAsk;
			market.bids = new Map(
				Object.entries(saved.bids).map(([k, v]) => [BigInt(k), v as PriceLevel]),
			);
			market.asks = new Map(
				Object.entries(saved.asks).map(([k, v]) => [BigInt(k), v as PriceLevel]),
			);
		}

		for (const [key, value] of Object.entries(parsed.orders)) {
			ORDERS.set(key, value as InternalOrder);
		}

		if (parsed.recentTrades) {
			for (const symbol of Object.keys(ORDERBOOK)) {
				RECENT_TRADES[symbol] = (parsed.recentTrades[symbol] as Fill[]) ?? [];
			}
		}

		if (parsed.metadata) {
			await cacheClient.set("engine:jobs:last_id", parsed.metadata.jobsLastId);
		}

		logger.info("Snapshot loaded", { metadata: parsed.metadata });
	} catch (err) {
		if (err && typeof err === "object" && "code" in err && (err as any).code === "ENOENT") {
			logger.info("No snapshot file found, starting with empty state");
		} else {
			logger.error("Error loading snapshot", err);
		}
	}
}
