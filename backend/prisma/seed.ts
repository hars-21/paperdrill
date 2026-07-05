import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seed() {
	const markets = [
		{
			name: "Bitcoin",
			symbol: "BTC_USD",
			baseAsset: "BTC",
			quoteAsset: "USD",
			pricePrecision: 2,
			quantityPrecision: 4,
		},
		{
			name: "Solana",
			symbol: "SOL_USD",
			baseAsset: "SOL",
			quoteAsset: "USD",
			pricePrecision: 2,
			quantityPrecision: 2,
		},
		{
			name: "Ethereum",
			symbol: "ETH_USD",
			baseAsset: "ETH",
			quoteAsset: "USD",
			pricePrecision: 2,
			quantityPrecision: 3,
		},
	];

	await prisma.market.createMany({
		data: markets,
		skipDuplicates: true,
	});

	const password = await bcrypt.hash("demo123", 10);
	const users = [
		{ email: "alice@test.com", name: "alice", password },
		{ email: "bob@test.com", name: "bob", password },
	];

	await prisma.user.createMany({
		data: users,
		skipDuplicates: true,
	});

	console.log("Seeded: 3 markets, 2 users (alice@test.com, bob@test.com, password: demo123)");
	process.exit(0);
}

seed()
	.catch((err) => {
		console.error("Seed failed:", err);
		process.exit(1);
	})
	.finally(() => {
		prisma.$disconnect();
	});
