import "dotenv/config";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
	DailyCreditStatus,
	OrderType,
	Scope,
	Side,
	Status,
	UserType,
} from "../generated/prisma/enums";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!process.argv.includes("--reset")) {
	throw new Error("This script clears the local database. Run it again with --reset.");
}
if (process.env.NODE_ENV === "production") {
	throw new Error("Demo seed cannot run with NODE_ENV=production");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "postgres", "host.docker.internal"]);
if (!localHosts.has(parsedDatabaseUrl.hostname)) {
	throw new Error(
		`Demo seed only accepts a local database, received ${parsedDatabaseUrl.hostname}`,
	);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const now = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const QUOTE_ASSET = "USD";
const INITIAL_DEPOSIT = 1_000_000n;
const DAILY_CREDIT_AMOUNT = 10_000n;
const baseline = INITIAL_DEPOSIT + DAILY_CREDIT_AMOUNT;
const creditDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const demoEmail = "demo@paperdrill.local";
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "paperdrill-demo";

const markets = [
	{
		name: "Bitcoin",
		symbol: "BTC_USD",
		baseAsset: "BTC",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 4,
		lastPrice: 83666.0,
		startPrice: 80_341,
		volatility: 0.0012,
		baseVolume: 0.42,
	},
	{
		name: "Ethereum",
		symbol: "ETH_USD",
		baseAsset: "ETH",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 3,
		lastPrice: 2576.38,
		startPrice: 2514.48,
		volatility: 0.0017,
		baseVolume: 7.8,
	},
	{
		name: "Solana",
		symbol: "SOL_USD",
		baseAsset: "SOL",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 2,
		lastPrice: 117.31,
		startPrice: 106.55,
		volatility: 0.0023,
		baseVolume: 265,
	},
] as const;

const traders = [
	["Maya Iyer", 32.64],
	["Elias Chen", 24.18],
	["Sofia Navarro", 18.92],
	["Arjun Sen", 15.37],
	["Nina Petrov", 12.84],
	["Leo Hart", 10.63],
	["Kian Rao", 7.42],
	["Amara Okoye", 6.91],
	["Theo Laurent", 5.48],
	["Hana Mori", 4.16],
	["Mateo Silva", 3.72],
	["Iris Novak", 2.95],
	["Zane Brooks", 2.21],
	["Leila Haddad", 1.64],
	["Jonas Berg", 0.88],
	["Priya Raman", 0.31],
	["Milo Costa", -1.18],
	["Anika Bose", -3.27],
	["Samir Qureshi", -6.82],
	["Clara Weiss", -11.46],
] as const;

function mulberry32(seed: number) {
	let value = seed >>> 0;
	return () => {
		value += 0x6d2b79f5;
		let result = value;
		result = Math.imul(result ^ (result >>> 15), result | 1);
		result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
		return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
	};
}

function scale(value: number, precision: number) {
	return BigInt(Math.round(value * 10 ** precision));
}

function emailFor(name: string) {
	return `${name.toLowerCase().replaceAll(" ", ".")}@paperdrill.local`;
}

function buildPortfolio(userId: string, createdAt: Date, index: number, returnPercent: number) {
	const market = markets[index % markets.length]!;
	const random = mulberry32(7_003 + index * 1_009);
	const targetEquity =
		(baseline * BigInt(Math.round((100 + returnPercent) * 100))) / 10_000n;
	const totalGain = targetEquity - baseline;
	// Keep most capital in cash so every seeded account has a plausible,
	// non-negative balance while still holding one meaningful position.
	const allocationBps = BigInt(3_500 + Math.round(random() * 2_200));
	const positionsValue = (targetEquity * allocationBps) / 10_000n;
	const price = scale(market.lastPrice, market.pricePrecision);
	const qty = (positionsValue * 10n ** BigInt(market.qtyPrecision)) / price;
	let unrealizedPnl = (totalGain * 6n) / 10n;
	let costBasis = positionsValue - unrealizedPnl;

	if (costBasis <= 0n) {
		costBasis = positionsValue / 2n;
		unrealizedPnl = positionsValue - costBasis;
	}

	const realizedPnl = totalGain - unrealizedPnl;
	const averagePrice = (costBasis * 10n ** BigInt(market.qtyPrecision)) / qty;

	return {
		userId,
		createdAt,
		market,
		price,
		targetEquity,
		totalGain,
		allocationBps,
		qty,
		costBasis,
		realizedPnl,
		unrealizedPnl,
		averagePrice,
		cash: targetEquity - positionsValue,
	};
}

/**
 * Daily history from account inception plus two-hourly points for the last
 * day. The generated fills are only activity history, so projections are
 * derived from these coherent portfolio snapshots instead.
 */
function buildSnapshotHistory(portfolio: ReturnType<typeof buildPortfolio>, seed: number) {
	const startMs = portfolio.createdAt.getTime();
	const endMs = now.getTime();
	const creditAt = endMs;
	const random = mulberry32(seed);
	const timestamps = new Set<number>([startMs, endMs]);

	for (let at = Math.ceil((startMs + 1) / DAY_MS) * DAY_MS; at < endMs; at += DAY_MS) {
		timestamps.add(at);
	}
	for (let at = endMs - DAY_MS; at < endMs; at += 2 * 60 * 60 * 1000) {
		if (at > startMs) timestamps.add(at);
	}

	const span = Math.max(1, endMs - startMs);
	const gainNumber = Number(portfolio.totalGain);

	return [...timestamps]
		.sort((left, right) => left - right)
		.map((at) => {
			const progress = (at - startMs) / span;
			const wobble =
				Math.sin(progress * Math.PI) * (random() * 2 - 1) * Math.abs(gainNumber) * 0.06;
			const gain = BigInt(
				Math.round(gainNumber * Math.pow(progress, 1.08) + wobble),
			);
			const netContributions = at >= creditAt ? baseline : INITIAL_DEPOSIT;
			const equity = netContributions + gain;
			const positionsValue = (equity * portfolio.allocationBps) / 10_000n;
			const unrealizedPnl = (gain * 6n) / 10n;

			return {
				id: crypto.randomUUID(),
				userId: portfolio.userId,
				at: new Date(at),
				quoteAsset: QUOTE_ASSET,
				cash: equity - positionsValue,
				positionsValue,
				equity,
				realizedPnl: gain - unrealizedPnl,
				unrealizedPnl,
				netContributions,
				partial: false,
			};
		});
}

function buildCandles(market: (typeof markets)[number], marketIndex: number) {
	const random = mulberry32(8_141 + marketIndex * 9_973);
	const intervalMs = 5 * 60 * 1000;
	const count = 14 * 24 * 12;
	const end = Math.floor(now.getTime() / intervalMs) * intervalMs;
	const rawCloses: number[] = [];
	let price: number = market.startPrice;

	for (let index = 0; index < count; index += 1) {
		const progress = index / (count - 1);
		const expected = market.startPrice + (market.lastPrice - market.startPrice) * progress;
		const pull = (expected - price) * 0.018;
		const noise = (random() + random() + random() - 1.5) * market.volatility * price;
		price = Math.max(0.01, price + pull + noise);
		rawCloses.push(price);
	}

	const adjustment = market.lastPrice / rawCloses.at(-1)!;
	let previousClose: number = market.startPrice * adjustment;

	return rawCloses.map((rawClose, index) => {
		const close = rawClose * adjustment;
		const movement = Math.abs(close - previousClose) / previousClose;
		const wick = market.volatility * (0.35 + random()) + movement * 0.25;
		const high = Math.max(previousClose, close) * (1 + wick);
		const low = Math.min(previousClose, close) * (1 - wick * (0.75 + random() * 0.35));
		const volume = market.baseVolume * (0.55 + random() * 1.7 + movement / market.volatility);
		const candle = {
			symbol: market.symbol,
			open: scale(previousClose, market.pricePrecision),
			high: scale(high, market.pricePrecision),
			low: scale(low, market.pricePrecision),
			close: scale(close, market.pricePrecision),
			volume: scale(volume, market.qtyPrecision),
			time: new Date(end - (count - 1 - index) * intervalMs),
		};
		previousClose = close;
		return candle;
	});
}

async function insertBatches<T>(
	items: T[],
	insert: (batch: T[]) => Promise<unknown>,
	batchSize = 1_500,
) {
	for (let index = 0; index < items.length; index += batchSize) {
		await insert(items.slice(index, index + batchSize));
	}
}

async function clearDatabase() {
	await prisma.$transaction(async (transaction) => {
		await transaction.positionEvent.deleteMany();
		await transaction.position.deleteMany();
		await transaction.portfolioSnapshot.deleteMany();
		await transaction.balanceHistory.deleteMany();
		await transaction.balance.deleteMany();
		await transaction.projectionCursor.deleteMany();
		await transaction.verificationToken.deleteMany();
		await transaction.dailyCredit.deleteMany();
		await transaction.apiKey.deleteMany();
		await transaction.fill.deleteMany();
		await transaction.order.deleteMany();
		await transaction.candle.deleteMany();
		await transaction.market.deleteMany();
		await transaction.user.deleteMany();
	});
}

async function seed() {
	console.log(`Resetting local database ${parsedDatabaseUrl.pathname.slice(1)}...`);
	await clearDatabase();

	await prisma.market.createMany({
		data: markets.map(({ lastPrice, startPrice, volatility, baseVolume, ...market }) => market),
	});

	const [userPassword, servicePassword] = await Promise.all([
		bcrypt.hash(demoPassword, 10),
		bcrypt.hash(crypto.randomUUID(), 10),
	]);
	const userRows = traders.map(([name], index) => {
		const createdAt = new Date(now.getTime() - (48 - index) * DAY_MS);

		return {
			id: crypto.randomUUID(),
			name,
			email: name === "Kian Rao" ? demoEmail : emailFor(name),
			emailVerified: true,
			password: userPassword,
			type: UserType.USER,
			pnlBaseline: baseline,
			pnlBaselineAt: createdAt,
			createdAt,
			updatedAt: now,
		};
	});
	const serviceRows = markets.map((market) => ({
		id: crypto.randomUUID(),
		name: `${market.baseAsset} Market Maker`,
		email: `${market.baseAsset.toLowerCase()}.service@paperdrill.local`,
		emailVerified: true,
		password: servicePassword,
		type: UserType.SERVICE,
		pnlBaseline: null,
		pnlBaselineAt: null,
		createdAt: new Date(now.getTime() - 90 * DAY_MS),
		updatedAt: now,
	}));
	await prisma.user.createMany({ data: [...userRows, ...serviceRows] });
	const demoUser = userRows.find((user) => user.email === demoEmail)!;
	await prisma.apiKey.createMany({
		data: [
			{
				userId: demoUser.id,
				label: "Trading terminal",
				hashedSecret: crypto.createHash("sha256").update("demo-terminal-key").digest("hex"),
				scopes: [Scope.ACCOUNT_READ, Scope.ORDER_READ, Scope.ORDER_CREATE, Scope.ORDER_CANCEL],
				lastUsedAt: new Date(now.getTime() - 34 * 60 * 1000),
				createdAt: new Date(now.getTime() - 17 * DAY_MS),
			},
			{
				userId: demoUser.id,
				label: "Portfolio analytics",
				hashedSecret: crypto.createHash("sha256").update("demo-analytics-key").digest("hex"),
				scopes: [Scope.ACCOUNT_READ, Scope.ORDER_READ],
				lastUsedAt: new Date(now.getTime() - 3 * DAY_MS),
				createdAt: new Date(now.getTime() - 9 * DAY_MS),
			},
		],
	});

	const creditRows = userRows.map((user) => ({
		id: crypto.randomUUID(),
		userId: user.id,
		creditDate,
		asset: QUOTE_ASSET,
		amount: DAILY_CREDIT_AMOUNT,
		status: DailyCreditStatus.APPLIED,
		createdAt: now,
		appliedAt: now,
	}));
	const creditByUser = new Map<string, (typeof creditRows)[number]>(
		creditRows.map((credit) => [credit.userId, credit]),
	);
	const portfolios = userRows.map((user, index) =>
		buildPortfolio(user.id, user.createdAt, index, traders[index]![1]),
	);
	const balances = portfolios.flatMap((portfolio) => [
		{
			userId: portfolio.userId,
			asset: QUOTE_ASSET,
			available: portfolio.cash,
			locked: 0n,
			updatedAt: now,
		},
		{
			userId: portfolio.userId,
			asset: portfolio.market.baseAsset,
			available: portfolio.qty,
			locked: 0n,
			updatedAt: now,
		},
	]);
	const positions = portfolios.map((portfolio, index) => ({
		userId: portfolio.userId,
		asset: portfolio.market.baseAsset,
		qty: portfolio.qty,
		costBasis: portfolio.costBasis,
		realizedPnl: portfolio.realizedPnl,
		lastBuyPrice: portfolio.averagePrice,
		lastBuyQty: portfolio.qty / 2n,
		lastBuyAt: new Date(now.getTime() - (3 + (index % 5)) * DAY_MS),
		lastSellPrice: portfolio.price,
		lastSellQty: portfolio.qty / 4n,
		lastSellAt: new Date(now.getTime() - (1 + (index % 3)) * DAY_MS),
		tradeCount: 8 + (index % 11),
		updatedAt: now,
	}));
	const snapshots = portfolios.flatMap((portfolio, index) =>
		buildSnapshotHistory(portfolio, 91_003 + index * 577),
	);
	const balanceHistory = portfolios.flatMap((portfolio) => {
		const credit = creditByUser.get(portfolio.userId)!;

		return [
			{
				id: crypto.randomUUID(),
				userId: portfolio.userId,
				asset: QUOTE_ASSET,
				available: INITIAL_DEPOSIT,
				locked: 0n,
				deltaAvailable: INITIAL_DEPOSIT,
				deltaLocked: 0n,
				reason: "initialized",
				referenceId: null,
				symbol: null,
				occurredAt: portfolio.createdAt,
			},
			{
				id: crypto.randomUUID(),
				userId: portfolio.userId,
				asset: QUOTE_ASSET,
				available: baseline,
				locked: 0n,
				deltaAvailable: DAILY_CREDIT_AMOUNT,
				deltaLocked: 0n,
				reason: "credited",
				referenceId: credit.id,
				symbol: null,
				occurredAt: now,
			},
		];
	});
	await prisma.balance.createMany({ data: balances });
	await prisma.position.createMany({ data: positions });
	await prisma.balanceHistory.createMany({ data: balanceHistory });
	await prisma.dailyCredit.createMany({ data: creditRows });
	await insertBatches(snapshots, (data) => prisma.portfolioSnapshot.createMany({ data }));

	const candles = markets.flatMap((market, index) => buildCandles(market, index));
	await insertBatches(candles, (data) => prisma.candle.createMany({ data }));

	const orders = [];
	const fills = [];
	for (const [marketIndex, market] of markets.entries()) {
		const random = mulberry32(40_031 + marketIndex * 7_919);
		const service = serviceRows[marketIndex]!;
		const marketCandles = candles.filter((candle) => candle.symbol === market.symbol);

		for (let index = 0; index < 90; index += 1) {
			const trader = userRows[(index + marketIndex * 5) % userRows.length]!;
			const peer = userRows[(index * 7 + marketIndex + 3) % userRows.length]!;
			const candle = marketCandles.at(-1 - Math.floor((89 - index) * 3.1))!;
			const createdAt = new Date(now.getTime() - (90 - index) * 16 * 60 * 1000);
			const price = BigInt(Math.round(Number(candle.close) * (0.999 + random() * 0.002)));
			const qty = scale(market.baseVolume * (0.08 + random() * 0.72), market.qtyPrecision);
			const cost = (price * qty) / 10n ** BigInt(market.qtyPrecision);
			const buyer = index % 2 === 0 ? trader : service;
			const seller = index % 2 === 0 ? (index % 11 === 0 ? peer : service) : trader;
			const buyOrderId = crypto.randomUUID();
			const sellOrderId = crypto.randomUUID();

			orders.push(
				{
					id: buyOrderId,
					userId: buyer.id,
					symbol: market.symbol,
					price,
					qty,
					type: index % 4 === 0 ? OrderType.MARKET : OrderType.LIMIT,
					side: Side.BUY,
					filledQty: qty,
					status: Status.FILLED,
					lockedAmount: cost,
					spentAmount: cost,
					averagePrice: price,
					createdAt: new Date(createdAt.getTime() - 18_000),
				},
				{
					id: sellOrderId,
					userId: seller.id,
					symbol: market.symbol,
					price,
					qty,
					type: OrderType.LIMIT,
					side: Side.SELL,
					filledQty: qty,
					status: Status.FILLED,
					lockedAmount: qty,
					spentAmount: 0n,
					averagePrice: price,
					createdAt: new Date(createdAt.getTime() - 31_000),
				},
			);
			fills.push({
				id: crypto.randomUUID(),
				symbol: market.symbol,
				price,
				qty,
				isBuyerMaker: index % 3 !== 0,
				buyOrderId,
				sellOrderId,
				buyerId: buyer.id,
				sellerId: seller.id,
				createdAt,
			});
		}
	}
	await insertBatches(orders, (data) => prisma.order.createMany({ data }));
	await insertBatches(fills, (data) => prisma.fill.createMany({ data }));

	console.log("Demo data ready", {
		markets: markets.length,
		traders: traders.length,
		candles: candles.length,
		orders: orders.length,
		fills: fills.length,
		positions: positions.length,
		snapshots: snapshots.length,
	});
	console.log(`Login: ${demoEmail} / ${demoPassword}`);
}

seed()
	.catch((error) => {
		console.error("Demo seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
