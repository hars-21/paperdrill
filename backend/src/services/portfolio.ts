import { prisma } from "../db";
import { cacheClient } from "../redis";
import { marketStore, type MarketMetadata } from "../store/market";
import { sendToEngine } from "../utils/engineClient";
import { logger } from "../utils/logger";
import { calculatePortfolio, type Balance } from "../utils/portfolio";
import { getReferencePrices } from "../utils/referencePrice";

const SNAPSHOT_KEY_PREFIX = "portfolio:snapshot:";
const SNAPSHOT_STALE_MS = 15 * 60 * 1000;
const CONTRIBUTION_REASONS = ["initialized", "deposited", "credited"];

export type PortfolioSource = "live" | "projection" | "engine";

export interface PortfolioViewPosition {
	asset: string;
	symbol: string | null;
	qtyPrecision: number;
	qty: bigint;
	available: bigint;
	locked: bigint;
	costBasis: bigint | null;
	averageCost: bigint | null;
	markPrice: bigint | null;
	value: bigint;
	realizedPnl: bigint | null;
	unrealizedPnl: bigint | null;
	lastBuyPrice: bigint | null;
	lastBuyQty: bigint | null;
	lastBuyAt: number | null;
	lastSellPrice: bigint | null;
	lastSellQty: bigint | null;
	lastSellAt: number | null;
	tradeCount: number | null;
	partial: boolean;
}

export interface PortfolioView {
	userId: string;
	quoteAsset: string;
	quotePrecision: number;
	asOf: number;
	source: PortfolioSource;
	partial: boolean;
	cash: bigint;
	positionsValue: bigint;
	equity: bigint;
	costBasis: bigint | null;
	realizedPnl: bigint | null;
	unrealizedPnl: bigint | null;
	netContributions: bigint | null;
	contributionsAt: number | null;
	positions: PortfolioViewPosition[];
}

export interface ProjectionPosition {
	asset: string;
	qty: bigint;
	costBasis: bigint;
	realizedPnl: bigint;
	lastBuyPrice: bigint | null;
	lastBuyQty: bigint | null;
	lastBuyAt: number | null;
	lastSellPrice: bigint | null;
	lastSellQty: bigint | null;
	lastSellAt: number | null;
	tradeCount: number;
}

export interface ProjectionBalance {
	asset: string;
	available: bigint;
	locked: bigint;
}

export interface ProjectionInput {
	userId: string;
	at: number;
	markets: MarketMetadata[];
	prices: ReadonlyMap<string, bigint>;
	positions: ProjectionPosition[];
	balances: ProjectionBalance[];
	netContributions: bigint | null;
	contributionsAt: number | null;
}

interface SnapshotPayload {
	userId: string;
	at: number;
	quoteAsset: string;
	quotePrecision: number;
	cash: string;
	positionsValue: string;
	equity: string;
	costBasis: string;
	realizedPnl: string;
	unrealizedPnl: string;
	netContributions: string;
	partial?: boolean;
	positions: SnapshotPayloadPosition[];
}

interface SnapshotPayloadPosition {
	asset: string;
	symbol?: string | null;
	qtyPrecision?: number;
	qty: string;
	available: string;
	locked: string;
	costBasis: string;
	averageCost?: string | null;
	markPrice?: string | null;
	value: string;
	realizedPnl: string;
	unrealizedPnl: string;
	lastBuyPrice?: string | null;
	lastBuyQty?: string | null;
	lastBuyAt?: number | null;
	lastSellPrice?: string | null;
	lastSellQty?: string | null;
	lastSellAt?: number | null;
	tradeCount?: number;
}

export function quoteContext(markets: MarketMetadata[]) {
	const quoteAssets = new Set(markets.map((market) => market.quoteAsset));
	const quoteAsset = quoteAssets.values().next().value ?? "USD";
	const quotePrecision =
		markets.find((market) => market.quoteAsset === quoteAsset)?.pricePrecision ?? 2;

	return { quoteAsset, quotePrecision };
}

/** Value a projected position set exactly like the worker does. */
export function buildProjectionView(input: ProjectionInput): PortfolioView {
	const { quoteAsset, quotePrecision } = quoteContext(input.markets);
	const marketByAsset = new Map<string, MarketMetadata>();
	for (const market of input.markets) {
		if (!marketByAsset.has(market.baseAsset)) marketByAsset.set(market.baseAsset, market);
	}

	const balanceByAsset = new Map(input.balances.map((balance) => [balance.asset, balance]));
	const projected = new Set(input.positions.map((position) => position.asset));

	let positionsValue = 0n;
	let costBasis = 0n;
	let realizedPnl = 0n;
	let unrealizedPnl = 0n;
	let partial = false;

	const positions: PortfolioViewPosition[] = [];

	const track = (position: PortfolioViewPosition) => {
		positions.push(position);
		positionsValue += position.value;
		costBasis += position.costBasis ?? 0n;
		realizedPnl += position.realizedPnl ?? 0n;
		unrealizedPnl += position.unrealizedPnl ?? 0n;
		partial ||= position.partial || position.qty < 0n;
	};

	for (const row of input.positions) {
		const market = marketByAsset.get(row.asset);
		const balance = balanceByAsset.get(row.asset);
		const qtyPrecision = market?.qtyPrecision ?? 0;
		const mark = market ? (input.prices.get(market.symbol) ?? null) : null;
		const averageCost =
			row.qty > 0n ? (row.costBasis * 10n ** BigInt(qtyPrecision)) / row.qty : null;
		const markPrice = mark ?? averageCost;
		const value =
			markPrice == null ? 0n : quoteAmount(markPrice, row.qty, qtyPrecision);
		const unrealized =
			row.qty > 0n && markPrice != null ? value - row.costBasis : 0n;
		const missingPrice = row.qty > 0n && mark == null;

		track({
			asset: row.asset,
			symbol: market?.symbol ?? null,
			qtyPrecision,
			qty: row.qty,
			available: balance?.available ?? 0n,
			locked: balance?.locked ?? 0n,
			costBasis: row.costBasis,
			averageCost,
			markPrice,
			value,
			realizedPnl: row.realizedPnl,
			unrealizedPnl: unrealized,
			lastBuyPrice: row.lastBuyPrice,
			lastBuyQty: row.lastBuyQty,
			lastBuyAt: row.lastBuyAt,
			lastSellPrice: row.lastSellPrice,
			lastSellQty: row.lastSellQty,
			lastSellAt: row.lastSellAt,
			tradeCount: row.tradeCount,
			partial: missingPrice,
		});
	}

	// Holdings without a projection are valued at the current mark so they are
	// never dropped from equity, but they are flagged partial because their
	// cost basis is unknown.
	for (const balance of input.balances) {
		if (balance.asset === quoteAsset || projected.has(balance.asset)) continue;

		const market = marketByAsset.get(balance.asset);
		if (!market) continue;

		const total = balance.available + balance.locked;
		if (total === 0n) continue;

		const mark = input.prices.get(market.symbol) ?? null;
		const value =
			mark == null ? 0n : quoteAmount(mark, total, market.qtyPrecision);

		track({
			asset: balance.asset,
			symbol: market.symbol,
			qtyPrecision: market.qtyPrecision,
			qty: total,
			available: balance.available,
			locked: balance.locked,
			costBasis: 0n,
			averageCost: null,
			markPrice: mark,
			value,
			realizedPnl: 0n,
			unrealizedPnl: value,
			lastBuyPrice: null,
			lastBuyQty: null,
			lastBuyAt: null,
			lastSellPrice: null,
			lastSellQty: null,
			lastSellAt: null,
			tradeCount: 0,
			partial: true,
		});
	}

	positions.sort((left, right) => left.asset.localeCompare(right.asset));

	const quoteBalance = balanceByAsset.get(quoteAsset);
	const cash = (quoteBalance?.available ?? 0n) + (quoteBalance?.locked ?? 0n);

	return {
		userId: input.userId,
		quoteAsset,
		quotePrecision,
		asOf: input.at,
		source: "projection",
		partial,
		cash,
		positionsValue,
		equity: cash + positionsValue,
		costBasis,
		realizedPnl,
		unrealizedPnl,
		netContributions: input.netContributions,
		contributionsAt: input.contributionsAt,
		positions,
	};
}

function quoteAmount(price: bigint, qty: bigint, qtyPrecision: number) {
	return (price * qty) / 10n ** BigInt(qtyPrecision);
}

function parseSnapshot(raw: string, userId: string): PortfolioView | null {
	let payload: SnapshotPayload;

	try {
		payload = JSON.parse(raw) as SnapshotPayload;
	} catch {
		return null;
	}

	if (!payload || payload.userId !== userId || !Array.isArray(payload.positions)) {
		return null;
	}

	const at = Number(payload.at);
	if (!Number.isFinite(at) || Date.now() - at > SNAPSHOT_STALE_MS) return null;

	try {
		return {
			userId,
			quoteAsset: String(payload.quoteAsset ?? "USD"),
			quotePrecision: Number(payload.quotePrecision ?? 2),
			asOf: at,
			source: "live",
			partial: Boolean(payload.partial),
			cash: BigInt(payload.cash),
			positionsValue: BigInt(payload.positionsValue),
			equity: BigInt(payload.equity),
			costBasis: BigInt(payload.costBasis),
			realizedPnl: BigInt(payload.realizedPnl),
			unrealizedPnl: BigInt(payload.unrealizedPnl),
			netContributions:
				payload.netContributions == null ? null : BigInt(payload.netContributions),
			contributionsAt: null,
			positions: payload.positions.map((position) => ({
				asset: position.asset,
				symbol: position.symbol ?? null,
				qtyPrecision: Number(position.qtyPrecision ?? 0),
				qty: BigInt(position.qty),
				available: BigInt(position.available),
				locked: BigInt(position.locked),
				costBasis: BigInt(position.costBasis),
				averageCost: toBigInt(position.averageCost),
				markPrice: toBigInt(position.markPrice),
				value: BigInt(position.value),
				realizedPnl: BigInt(position.realizedPnl),
				unrealizedPnl: BigInt(position.unrealizedPnl),
				lastBuyPrice: toBigInt(position.lastBuyPrice),
				lastBuyQty: toBigInt(position.lastBuyQty),
				lastBuyAt: position.lastBuyAt ?? null,
				lastSellPrice: toBigInt(position.lastSellPrice),
				lastSellQty: toBigInt(position.lastSellQty),
				lastSellAt: position.lastSellAt ?? null,
				tradeCount: position.tradeCount ?? 0,
				partial: false,
			})),
		};
	} catch (err) {
		logger.warn("Ignoring malformed portfolio snapshot", {
			userId,
			error: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}

function toBigInt(value: string | null | undefined) {
	return value == null ? null : BigInt(value);
}

async function loadLiveView(userId: string) {
	const raw = await cacheClient.get(`${SNAPSHOT_KEY_PREFIX}${userId}`);
	if (!raw) return null;

	return parseSnapshot(raw, userId);
}

async function contributionSum(userId: string, quoteAsset: string) {
	const result = await prisma.balanceHistory.aggregate({
		where: {
			userId,
			asset: quoteAsset,
			reason: { in: CONTRIBUTION_REASONS },
		},
		_sum: { deltaAvailable: true },
		_count: true,
	});

	if (result._count === 0) return null;
	return result._sum.deltaAvailable ?? 0n;
}

async function loadProjectionView(userId: string) {
	const markets = [...marketStore.values()];
	if (markets.length === 0) return null;

	const [positions, balances, user] = await Promise.all([
		prisma.position.findMany({ where: { userId } }),
		prisma.balance.findMany({ where: { userId } }),
		prisma.user.findUnique({
			where: { id: userId },
			select: { pnlBaseline: true, pnlBaselineAt: true },
		}),
	]);

	if (!user) return null;
	if (positions.length === 0 && balances.length === 0) return null;

	const { quoteAsset } = quoteContext(markets);
	const netContributions =
		user.pnlBaseline ?? (await contributionSum(userId, quoteAsset));

	const referencePrices = await getReferencePrices(markets);
	const prices = new Map<string, bigint>();
	for (const [symbol, reference] of referencePrices) {
		prices.set(symbol, reference.price);
	}

	return buildProjectionView({
		userId,
		at: Date.now(),
		markets,
		prices,
		positions: positions.map((position) => ({
			asset: position.asset,
			qty: position.qty,
			costBasis: position.costBasis,
			realizedPnl: position.realizedPnl,
			lastBuyPrice: position.lastBuyPrice,
			lastBuyQty: position.lastBuyQty,
			lastBuyAt: position.lastBuyAt?.getTime() ?? null,
			lastSellPrice: position.lastSellPrice,
			lastSellQty: position.lastSellQty,
			lastSellAt: position.lastSellAt?.getTime() ?? null,
			tradeCount: position.tradeCount,
		})),
		balances: balances.map((balance) => ({
			asset: balance.asset,
			available: balance.available,
			locked: balance.locked,
		})),
		netContributions,
		contributionsAt: user.pnlBaselineAt?.getTime() ?? null,
	});
}

async function loadEngineView(userId: string) {
	const markets = [...marketStore.values()];
	if (markets.length === 0) return null;

	const [engineResponse, user] = await Promise.all([
		sendToEngine("get_user_balance", { userId }),
		prisma.user.findUnique({
			where: { id: userId },
			select: { pnlBaseline: true, pnlBaselineAt: true },
		}),
	]);

	if (!engineResponse.success || !user) return null;

	const balances = engineResponse.data as Record<string, Balance>;
	const parsed: Record<string, Balance> = {};
	for (const [asset, value] of Object.entries(balances)) {
		parsed[asset] = {
			available: BigInt(value.available.toString()),
			locked: BigInt(value.locked.toString()),
		};
	}

	const prices = await getReferencePrices(markets);
	const portfolio = calculatePortfolio(parsed, markets, prices);
	const marketByAsset = new Map<string, MarketMetadata>();
	for (const market of markets) {
		if (!marketByAsset.has(market.baseAsset)) marketByAsset.set(market.baseAsset, market);
	}

	const positions: PortfolioViewPosition[] = portfolio.positions
		.filter((position) => position.asset !== portfolio.quoteAsset)
		.map((position) => ({
			asset: position.asset,
			symbol: marketByAsset.get(position.asset)?.symbol ?? null,
			qtyPrecision: position.precision,
			qty: position.total,
			available: position.available,
			locked: position.locked,
			costBasis: null,
			averageCost: null,
			markPrice: position.markPrice,
			value: position.value,
			realizedPnl: null,
			unrealizedPnl: null,
			lastBuyPrice: null,
			lastBuyQty: null,
			lastBuyAt: null,
			lastSellPrice: null,
			lastSellQty: null,
			lastSellAt: null,
			tradeCount: null,
			partial: false,
		}));

	const quotePosition = portfolio.positions.find(
		(position) => position.asset === portfolio.quoteAsset,
	);
	const cash = quotePosition?.total ?? 0n;

	return {
		userId,
		quoteAsset: portfolio.quoteAsset,
		quotePrecision: portfolio.quotePrecision,
		asOf: Date.now(),
		source: "engine" as const,
		partial: portfolio.partial,
		cash,
		positionsValue: portfolio.equity - cash,
		equity: portfolio.equity,
		costBasis: null,
		realizedPnl: null,
		unrealizedPnl: null,
		netContributions: user.pnlBaseline,
		contributionsAt: user.pnlBaselineAt?.getTime() ?? null,
		positions,
	};
}

/**
 * Read path: live worker snapshot, then the Postgres projection, then the
 * matching engine. The cached snapshot is the freshest and cheapest source,
 * while the projection keeps PnL available when the worker restarts.
 */
export async function loadPortfolioView(userId: string): Promise<PortfolioView | null> {
	const live = await loadLiveView(userId);
	if (live) return live;

	const projection = await loadProjectionView(userId);
	if (projection) return projection;

	return loadEngineView(userId);
}
