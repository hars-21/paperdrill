import { config } from "./config";
import { MARKET } from "./client";

interface Order {
	side: "BUY" | "SELL";
	price: string;
	qty: string;
}

function formatPrice(price: number): string {
	return price.toFixed(MARKET.pricePrecision);
}

function randomQty(): string {
	const maxQty = config.maxOrderQty ?? 0.5;
	return (Math.random() * maxQty).toFixed(MARKET.qtyPrecision);
}

export function generateOrders(midPrice: number): Order[] {
	const halfSpread = (config.spreadPercent / 100 / 2) * midPrice;
	const orders: Order[] = [];

	for (let i = 0; i < config.depthPerSide; i++) {
		const step = (halfSpread * (i + 1)) / config.depthPerSide;
		const randomness = (Math.random() - 0.5) * (config.randomnessPercent / 100) * midPrice;

		const bidPrice = midPrice - halfSpread - step + randomness;
		const askPrice = midPrice + halfSpread + step + randomness;

		orders.push(
			{
				side: "BUY",
				price: formatPrice(bidPrice),
				qty: randomQty(),
			},
			{
				side: "SELL",
				price: formatPrice(askPrice),
				qty: randomQty(),
			},
		);
	}

	return orders;
}
