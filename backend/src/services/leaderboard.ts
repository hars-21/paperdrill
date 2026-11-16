import { prisma } from "../db";
import { marketStore } from "../store/market";
import { logger } from "../utils/logger";
import {
	appendLeaderboardHistory,
	compactLeaderboardHistory,
	leaderboardHistoryForRange,
	rankLeaderboard,
	type LeaderboardHistoryPoint,
	type LeaderboardRange,
	type LeaderboardStanding,
} from "../utils/leaderboard";
import { activeSubscriptions } from "../utils/websocket";

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_RETENTION_MS = 365 * DAY_MS;
const SEED_BATCH_SIZE = 50;
const HISTORY_QUERY_LIMIT = 5_000;
const BROADCAST_DEBOUNCE_MS = 750;
const SEED_RETRY_MS = 15_000;
const LEADERBOARD_CHANNEL = "leaderboard";

interface Participant {
	userId: string;
	name: string;
	createdAt: number;
	baseline: bigint;
	baselineAt: number | null;
	equity: bigint;
	netContributions: bigint;
	asOf: number;
	partial: boolean;
	history: LeaderboardHistoryPoint[];
}

interface LiveAccountSnapshot {
	userId: string;
	at: number;
	quoteAsset: string;
	equity: bigint;
	netContributions: bigint;
	partial: boolean;
}

export interface LeaderboardEntryView {
	standing: LeaderboardStanding;
	name: string;
	history: LeaderboardHistoryPoint[];
}

export interface LeaderboardPage {
	ready: boolean;
	asOf: string;
	quoteAsset: string;
	quotePrecision: number;
	range: LeaderboardRange;
	total: number;
	entries: LeaderboardEntryView[];
}

const participants = new Map<string, Participant>();
const loadingUsers = new Set<string>();
const ineligibleUsers = new Set<string>();
const pendingSnapshots = new Map<string, LiveAccountSnapshot>();

let quoteAsset = "USD";
let quotePrecision = 2;
let seeded = false;
let updatedAt = Date.now();
let broadcastTimer: ReturnType<typeof setTimeout> | null = null;
let seedRetryTimer: ReturnType<typeof setTimeout> | null = null;
let startPromise: Promise<void> | null = null;

function quoteContext() {
	const markets = [...marketStore.values()];
	const quoteAssets = new Set(markets.map((market) => market.quoteAsset));
	const asset = quoteAssets.values().next().value ?? "USD";
	const precision =
		markets.find((market) => market.quoteAsset === asset)?.pricePrecision ?? 2;

	return { asset, precision };
}

async function loadHistory(userId: string) {
	const rows = await prisma.portfolioSnapshot.findMany({
		where: {
			userId,
			partial: false,
			at: { gte: new Date(Date.now() - HISTORY_RETENTION_MS) },
		},
		orderBy: { at: "desc" },
		take: HISTORY_QUERY_LIMIT,
		select: { at: true, equity: true, netContributions: true },
	});

	return rows
		.reverse()
		.map((row) => ({ at: row.at.getTime(), equity: row.equity, netContributions: row.netContributions }));
}

function createParticipant(input: {
	userId: string;
	name: string;
	createdAt: number;
	baseline: bigint;
	baselineAt: number | null;
	history: LeaderboardHistoryPoint[];
}): Participant {
	const points = compactLeaderboardHistory(input.history);
	const latest = points[points.length - 1];
	const fallbackAt = input.baselineAt ?? input.createdAt;

	return {
		userId: input.userId,
		name: input.name,
		createdAt: input.createdAt,
		baseline: input.baseline,
		baselineAt: input.baselineAt,
		equity: latest?.equity ?? input.baseline,
		netContributions: latest?.netContributions ?? input.baseline,
		asOf: latest?.at ?? fallbackAt,
		partial: false,
		history:
			points.length > 0
				? points
				: [{ at: fallbackAt, equity: input.baseline, netContributions: input.baseline }],
	};
}

function mergeHistory(
	seededHistory: LeaderboardHistoryPoint[],
	liveHistory: LeaderboardHistoryPoint[],
) {
	const merged = new Map<number, LeaderboardHistoryPoint>();

	for (const point of seededHistory) merged.set(point.at, point);
	for (const point of liveHistory) merged.set(point.at, point);

	return compactLeaderboardHistory([...merged.values()].sort((left, right) => left.at - right.at));
}

async function seedLeaderboard() {
	const context = quoteContext();
	quoteAsset = context.asset;
	quotePrecision = context.precision;

	const users = await prisma.user.findMany({
		where: {
			type: "USER",
			emailVerified: true,
			pnlBaseline: { not: null },
			OR: [{ buyFills: { some: {} } }, { sellFills: { some: {} } }],
		},
		select: {
			id: true,
			name: true,
			createdAt: true,
			pnlBaseline: true,
			pnlBaselineAt: true,
		},
	});

	const now = Date.now();
	let loadedSnapshots = 0;

	for (let start = 0; start < users.length; start += SEED_BATCH_SIZE) {
		const batch = users.slice(start, start + SEED_BATCH_SIZE);
		const ids = batch.map((user) => user.id);

		const rows = await prisma.portfolioSnapshot.findMany({
			where: {
				userId: { in: ids },
				partial: false,
				at: { gte: new Date(now - HISTORY_RETENTION_MS) },
			},
			orderBy: [{ userId: "asc" }, { at: "asc" }],
			select: { userId: true, at: true, equity: true, netContributions: true },
		});

		loadedSnapshots += rows.length;
		const historyByUser = new Map<string, LeaderboardHistoryPoint[]>();

		for (const row of rows) {
			let history = historyByUser.get(row.userId);
			if (!history) {
				history = [];
				historyByUser.set(row.userId, history);
			}
			history.push({
				at: row.at.getTime(),
				equity: row.equity,
				netContributions: row.netContributions,
			});
		}

		for (const user of batch) {
			const baseline = user.pnlBaseline ?? 0n;
			const seededParticipant = createParticipant({
				userId: user.id,
				name: user.name,
				createdAt: user.createdAt.getTime(),
				baseline,
				baselineAt: user.pnlBaselineAt?.getTime() ?? null,
				history: historyByUser.get(user.id) ?? [],
			});
			const live = participants.get(user.id);

			if (live && live.asOf > seededParticipant.asOf) {
				live.name = seededParticipant.name;
				live.createdAt = seededParticipant.createdAt;
				live.baseline = seededParticipant.baseline;
				live.baselineAt = seededParticipant.baselineAt;
				live.history = mergeHistory(seededParticipant.history, live.history);
				continue;
			}

			participants.set(user.id, seededParticipant);
		}
	}

	updatedAt = Date.now();
	logger.info("Leaderboard seeded from portfolio snapshots", {
		participants: participants.size,
		snapshots: loadedSnapshots,
	});
}

export function startLeaderboard() {
	if (startPromise) return startPromise;

	startPromise = seedLeaderboard()
		.then(() => {
			seeded = true;
		})
		.catch((error) => {
			logger.error("Failed to seed leaderboard", error);
			startPromise = null;

			// Keep the endpoint unavailable and retry instead of serving a
			// permanently empty leaderboard after a transient database error.
			if (!seedRetryTimer) {
				seedRetryTimer = setTimeout(() => {
					seedRetryTimer = null;
					void startLeaderboard();
				}, SEED_RETRY_MS);
				seedRetryTimer.unref?.();
			}
		});

	return startPromise;
}

export function stopLeaderboard() {
	if (broadcastTimer) clearTimeout(broadcastTimer);
	broadcastTimer = null;

	if (seedRetryTimer) clearTimeout(seedRetryTimer);
	seedRetryTimer = null;
}

function eligibleUserWhere(emailVerified: boolean, baseline: bigint | null) {
	return emailVerified && baseline != null && baseline > 0n;
}

async function ensureParticipant(userId: string) {
	if (
		participants.has(userId) ||
		loadingUsers.has(userId) ||
		ineligibleUsers.has(userId)
	) {
		return;
	}

	loadingUsers.add(userId);

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				createdAt: true,
				emailVerified: true,
				type: true,
				pnlBaseline: true,
				pnlBaselineAt: true,
				_count: { select: { buyFills: true, sellFills: true } },
			},
		});

		const trades = (user?._count.buyFills ?? 0) + (user?._count.sellFills ?? 0);
		if (!user || user.type !== "USER" || trades === 0) {
			ineligibleUsers.add(userId);
			return;
		}
		if (!eligibleUserWhere(user.emailVerified, user.pnlBaseline)) {
			ineligibleUsers.add(userId);
			return;
		}

		const history = await loadHistory(userId);
		const participant = createParticipant({
			userId: user.id,
			name: user.name,
			createdAt: user.createdAt.getTime(),
			baseline: user.pnlBaseline ?? 0n,
			baselineAt: user.pnlBaselineAt?.getTime() ?? null,
			history,
		});

		participants.set(userId, participant);

		const pending = pendingSnapshots.get(userId);
		if (pending) {
			applySnapshot(participant, pending);
			pendingSnapshots.delete(userId);
		}

		updatedAt = Date.now();
		scheduleBroadcast();
	} catch (error) {
		logger.warn("Failed to load leaderboard participant", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		loadingUsers.delete(userId);
	}
}

/** Add a verified trader that signed up or verified after the last seed. */
export async function ensureLeaderboardParticipant(userId: string) {
	// Verification makes a previously rejected user eligible; clear the cache.
	ineligibleUsers.delete(userId);
	await startLeaderboard();
	await ensureParticipant(userId);
}

function parseSnapshot(payload: unknown): LiveAccountSnapshot | null {
	if (!payload || typeof payload !== "object") return null;

	const value = payload as Record<string, unknown>;
	if (
		typeof value.userId !== "string" ||
		typeof value.equity !== "string" ||
		typeof value.netContributions !== "string"
	) {
		return null;
	}

	const at = Number(value.at);
	if (!Number.isFinite(at)) return null;

	try {
		return {
			userId: value.userId,
			at,
			quoteAsset: String(value.quoteAsset ?? "USD"),
			equity: BigInt(value.equity),
			netContributions: BigInt(value.netContributions),
			partial: Boolean(value.partial),
		};
	} catch {
		return null;
	}
}

function applySnapshot(participant: Participant, snapshot: LiveAccountSnapshot) {
	if (snapshot.at < participant.asOf) return false;

	participant.equity = snapshot.equity;
	participant.netContributions = snapshot.netContributions;
	participant.asOf = snapshot.at;
	participant.partial = snapshot.partial;
	participant.history = appendLeaderboardHistory(participant.history, {
		at: snapshot.at,
		equity: snapshot.equity,
		netContributions: snapshot.netContributions,
	});

	return true;
}

export function ingestAccountSnapshot(payload: unknown) {
	const snapshot = parseSnapshot(payload);
	if (!snapshot || snapshot.quoteAsset !== quoteAsset) return;

	const participant = participants.get(snapshot.userId);

	if (!participant) {
		if (pendingSnapshots.size > 1_000) {
			const oldest = pendingSnapshots.keys().next().value;
			if (oldest) pendingSnapshots.delete(oldest);
		}
		pendingSnapshots.set(snapshot.userId, snapshot);
		void ensureParticipant(snapshot.userId);
		return;
	}

	if (!applySnapshot(participant, snapshot)) return;

	updatedAt = Date.now();
	scheduleBroadcast();
}

function scheduleBroadcast() {
	if (broadcastTimer) return;

	broadcastTimer = setTimeout(() => {
		broadcastTimer = null;
		broadcastLeaderboard();
	}, BROADCAST_DEBOUNCE_MS);
	broadcastTimer.unref?.();
}

function broadcastLeaderboard() {
	const sockets = activeSubscriptions[LEADERBOARD_CHANNEL];
	if (!sockets || sockets.length === 0) return;

	const payload = JSON.stringify({
		channel: LEADERBOARD_CHANNEL,
		asOf: new Date(updatedAt).toISOString(),
	});

	for (const socket of sockets) {
		if (socket.readyState === 1) {
			try {
				socket.send(payload);
			} catch (error) {
				logger.warn("Failed to broadcast leaderboard update", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
}

function rankedStandings(range: LeaderboardRange, now: number) {
	const candidates = [];

	for (const participant of participants.values()) {
		if (participant.partial) continue;

		candidates.push({
			userId: participant.userId,
			createdAt: participant.createdAt,
			baseline: participant.baseline,
			baselineAt: participant.baselineAt,
			equity: participant.equity,
			netContributions: participant.netContributions,
			history: participant.history,
		});
	}

	return rankLeaderboard(candidates, range, now);
}

export function getLeaderboardMeta() {
	return {
		ready: seeded,
		asOf: new Date(updatedAt).toISOString(),
		quoteAsset,
		quotePrecision,
	};
}

export function getLeaderboardPage(input: {
	range: LeaderboardRange;
	limit: number;
	offset: number;
}): LeaderboardPage {
	const now = Date.now();
	const standings = rankedStandings(input.range, now);
	const page = standings.slice(input.offset, input.offset + input.limit);

	return {
		ready: seeded,
		asOf: new Date(updatedAt).toISOString(),
		quoteAsset,
		quotePrecision,
		range: input.range,
		total: standings.length,
		entries: page.map((standing) => ({
			standing,
			name: participants.get(standing.userId)?.name ?? "Trader",
			history: leaderboardHistoryForRange(
				participants.get(standing.userId)?.history ?? [],
				input.range,
				now,
			),
		})),
	};
}

export function getLeaderboardEntryForUser(
	userId: string,
	range: LeaderboardRange,
): LeaderboardEntryView | null {
	const now = Date.now();
	const standing = rankedStandings(range, now).find((entry) => entry.userId === userId);
	if (!standing) return null;

	const participant = participants.get(userId);

	return {
		standing,
		name: participant?.name ?? "Trader",
		history: leaderboardHistoryForRange(participant?.history ?? [], range, now),
	};
}
