import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seed() {
	const markets = [
		{ symbol: "BTC_USD", name: "Bitcoin/USD" },
		{ symbol: "SOL_USD", name: "Solana/USD" },
		{ symbol: "ETH_USD", name: "Ethereum/USD" },
	];

	for (const market of markets) {
		await prisma.market.upsert({
			where: { symbol: market.symbol },
			update: {},
			create: market,
		});
	}

	const password = await bcrypt.hash("demo123", 10);
	const users = [
		{ email: "alice@test.com", name: "alice", password },
		{ email: "bob@test.com", name: "bob", password },
	];

	for (const user of users) {
		await prisma.user.upsert({
			where: { email: user.email },
			update: {},
			create: user,
		});
	}

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
