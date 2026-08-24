import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { UserType } from "../generated/prisma/enums";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
			qtyPrecision: 4,
		},
		{
			name: "Solana",
			symbol: "SOL_USD",
			baseAsset: "SOL",
			quoteAsset: "USD",
			pricePrecision: 2,
			qtyPrecision: 2,
		},
		{
			name: "Ethereum",
			symbol: "ETH_USD",
			baseAsset: "ETH",
			quoteAsset: "USD",
			pricePrecision: 2,
			qtyPrecision: 3,
		},
	];

	await prisma.market.createMany({
		data: markets,
		skipDuplicates: true,
	});

	const password = await bcrypt.hash(crypto.randomUUID(), 10);
	const services = [
		{
			name: "BTC Market Maker",
			email: "btc.service@paperdrill.dev",
			password,
			type: UserType.SERVICE,
		},
		{
			name: "SOL Market Maker",
			email: "sol.service@paperdrill.dev",
			password,
			type: UserType.SERVICE,
		},
		{
			name: "ETH Market Maker",
			email: "eth.service@paperdrill.dev",
			password,
			type: UserType.SERVICE,
		},
	];

	await prisma.user.createMany({
		data: services,
		skipDuplicates: true,
	});

	console.log("Seeded: 3 markets, 3 services");
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
