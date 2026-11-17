import { pool } from "./db";
import { logger } from "./logger";

export interface WorkerMarket {
	symbol: string;
	baseAsset: string;
	quoteAsset: string;
	pricePrecision: number;
	qtyPrecision: number;
}

const markets = new Map<string, WorkerMarket>();

export async function loadMarkets() {
	const result = await pool.query<WorkerMarket>(
		'SELECT symbol, "baseAsset", "quoteAsset", "pricePrecision", "qtyPrecision" FROM "Market"',
	);

	markets.clear();
	for (const row of result.rows) markets.set(row.symbol, row);

	if (markets.size === 0) {
		logger.warn("No markets loaded, position projection will reject fills");
		return;
	}

	logger.info(`Loaded ${markets.size} markets for position projection`);
}

export function getMarket(symbol: string) {
	return markets.get(symbol);
}

export function listMarkets() {
	return [...markets.values()];
}
