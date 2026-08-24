import { prisma } from "../db";
import { logger } from "../utils/logger";

export interface MarketMetadata {
	symbol: string;
	baseAsset: string;
	quoteAsset: string;
	pricePrecision: number;
	qtyPrecision: number;
}

export const marketStore = new Map<string, MarketMetadata>();
export const assetPrecision = new Map<string, number>();

function setMarket(metadata: MarketMetadata) {
	marketStore.set(metadata.symbol, metadata);
	if (!assetPrecision.has(metadata.baseAsset)) {
		assetPrecision.set(metadata.baseAsset, metadata.qtyPrecision);
	}
	if (!assetPrecision.has(metadata.quoteAsset)) {
		assetPrecision.set(metadata.quoteAsset, metadata.pricePrecision);
	}
}

export async function loadMarkets(): Promise<void> {
	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	while (true) {
		try {
			const marketData = await prisma.market.findMany();

			if (marketData.length === 0) {
				logger.warn("No markets found in database, retrying in 5 seconds...");
				await wait(5000);
				continue;
			}

			marketStore.clear();
			assetPrecision.clear();

			for (const item of marketData) {
				setMarket({
					symbol: item.symbol,
					baseAsset: item.baseAsset,
					quoteAsset: item.quoteAsset,
					pricePrecision: item.pricePrecision,
					qtyPrecision: item.qtyPrecision,
				});
			}

			logger.info(`Loaded ${marketData.length} markets from database`);
			break;
		} catch (err) {
			logger.warn("Failed to load markets from database, will retry", err);
			await wait(5000);
		}
	}
}
