export const config = {
	baseUrl: process.env.BASE_URL ?? "http://localhost:8000",
	email: process.env.BOT_EMAIL ?? "bot@paperdrill.dev",
	password: process.env.BOT_PASSWORD ?? "bot123",

	market: (process.env.MARKET ?? "SOL_USD") as "BTC_USD" | "ETH_USD" | "SOL_USD",
	pricePrecision: 2,
	qtyPrecision: 2,

	depthPerSide: 20,
	cycleIntervalMs: [2000, 5000],
	spreadPercent: 0.2,
	randomnessPercent: 0.1,
	priceRefreshMs: 20000,
	maxOrderQty: process.env.MARKET === "BTC_USD" ? 0.1 : process.env.MARKET === "ETH_USD" ? 1 : 10,
};
