import z from "zod";

const env = z
	.object({
		BASE_URL: z.url(),
		SERVICE_TOKEN: z.string(),
		SERVICE_EMAIL: z.email(),
		MARKET: z.string(),
		MAX_ORDER_QTY: z.coerce.number().positive(),
	})
	.parse(process.env);

export const config = {
	baseUrl: env.BASE_URL,
	serviceToken: env.SERVICE_TOKEN,
	serviceEmail: env.SERVICE_EMAIL,

	market: env.MARKET,
	depthPerSide: 20,
	cycleIntervalMs: [2000, 5000],
	spreadPercent: 0.2,
	randomnessPercent: 0.1,
	priceRefreshMs: 20000,
	maxOrderQty: env.MAX_ORDER_QTY,
};
