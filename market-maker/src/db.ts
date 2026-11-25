import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool({
	connectionString: config.databaseUrl,
	...(config.env === "production" && { ssl: { rejectUnauthorized: true } }),
});

export interface MarketRow {
	symbol: string;
	baseAsset: string;
	quoteAsset: string;
	pricePrecision: number;
	qtyPrecision: number;
}

export interface ResolvedMarket extends MarketRow {
	userId: string;
}

export async function connectDB() {
	await pool.query("SELECT 1");
}

export async function disconnectDB() {
	await pool.end();
}

export async function resolveMarkets(): Promise<ResolvedMarket[]> {
	const symbols = config.markets.map((binding) => binding.symbol);
	const emails = config.markets.map((binding) => binding.serviceEmail);

	const [marketsResult, usersResult] = await Promise.all([
		pool.query<MarketRow>(
			`SELECT symbol, "baseAsset", "quoteAsset", "pricePrecision", "qtyPrecision"
			 FROM "Market" WHERE symbol = ANY($1::text[])`,
			[symbols],
		),
		pool.query<{ id: string; email: string }>(
			`SELECT id, email FROM "User" WHERE type = $1 AND email = ANY($2::text[])`,
			["SERVICE", emails],
		),
	]);

	const markets = new Map(marketsResult.rows.map((row) => [row.symbol, row]));
	const users = new Map(usersResult.rows.map((row) => [row.email, row.id]));

	return config.markets.map((binding) => {
		const market = markets.get(binding.symbol);
		const userId = users.get(binding.serviceEmail);

		if (!market) throw new Error(`Unknown allowlisted market: ${binding.symbol}`);
		if (!userId) throw new Error(`Unknown SERVICE account: ${binding.serviceEmail}`);

		return { ...market, userId };
	});
}
