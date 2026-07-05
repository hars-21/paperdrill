import { prisma } from "../db";
import { logger } from "../utils/logger";

interface Market {
	pricePrecision: number;
	qtyPrecision: number;
}

export const marketStore = new Map<string, Market>();
export const assetPrecision = new Map<string, number>();

try {
	const marketData = await prisma.market.findMany();

	for (const item of marketData) {
		marketStore.set(item.symbol, {
			pricePrecision: item.pricePrecision,
			qtyPrecision: item.quantityPrecision,
		});

		if (!assetPrecision.has(item.baseAsset)) {
			assetPrecision.set(item.baseAsset, item.quantityPrecision);
		}
		if (!assetPrecision.has(item.quoteAsset)) {
			assetPrecision.set(item.quoteAsset, item.pricePrecision);
		}
	}
} catch (err) {
	logger.error("error", err);
}
