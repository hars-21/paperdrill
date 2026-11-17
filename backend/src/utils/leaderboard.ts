export const LEADERBOARD_RANGES = ["24h", "7d", "30d", "all"] as const;

export type LeaderboardRange = (typeof LEADERBOARD_RANGES)[number];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const LEADERBOARD_RANGE_MS: Record<LeaderboardRange, number | null> = {
	"24h": DAY,
	"7d": 7 * DAY,
	"30d": 30 * DAY,
	all: null,
};

/** Hard cap on retained points per account before history is compacted. */
export const MAX_LEADERBOARD_HISTORY_POINTS = 360;

/** Points sent to the browser for a row sparkline or detail chart. */
export const MAX_LEADERBOARD_CHART_POINTS = 72;

export interface LeaderboardHistoryPoint {
	at: number;
	equity: bigint;
	netContributions: bigint;
}

export interface LeaderboardCandidate {
	userId: string;
	createdAt: number;
	/** Lifetime contributions recorded when the account started. */
	baseline: bigint;
	baselineAt: number | null;
	equity: bigint;
	netContributions: bigint;
	history: readonly LeaderboardHistoryPoint[];
}

export interface LeaderboardStanding {
	userId: string;
	createdAt: number;
	position: number;
	rank: number;
	equity: bigint;
	netContributions: bigint;
	/** Performance over the requested range, excluding contributions. */
	pnl: bigint;
	/** Range return in basis points, formatted as a decimal percentage. */
	returnBps: bigint;
	/** Lifetime performance, excluding contributions. */
	totalPnl: bigint;
	/** Lifetime return in basis points. */
	totalReturnBps: bigint;
	/** Timestamp of the capital baseline used for the range. */
	startAt: number;
	/** Capital base the range return is measured against. */
	denominator: bigint;
}

interface StartPoint {
	at: number;
	totalPnl: bigint;
	denominator: bigint;
}

function inceptionStart(candidate: LeaderboardCandidate): StartPoint {
	const denominator =
		candidate.netContributions > 0n ? candidate.netContributions : candidate.baseline;

	return {
		at: candidate.baselineAt ?? candidate.createdAt,
		totalPnl: 0n,
		denominator,
	};
}

function historyStart(point: LeaderboardHistoryPoint): StartPoint {
	return {
		at: point.at,
		totalPnl: point.equity - point.netContributions,
		denominator: point.netContributions > 0n ? point.netContributions : point.equity,
	};
}

/**
 * Pick the capital baseline for a range. Accounts younger than the range use
 * their inception baseline so a 24h view does not rank a brand-new account as
 * flat for activity that happened before its first snapshot.
 */
export function leaderboardStartPoint(
	candidate: LeaderboardCandidate,
	range: LeaderboardRange,
	now = Date.now(),
): StartPoint {
	if (range === "all") return inceptionStart(candidate);

	const span = LEADERBOARD_RANGE_MS[range];
	if (span == null) return inceptionStart(candidate);

	const cutoff = now - span;
	const inceptionAt = candidate.baselineAt ?? candidate.createdAt;

	if (inceptionAt >= cutoff) return inceptionStart(candidate);

	let start: LeaderboardHistoryPoint | null = null;
	for (const point of candidate.history) {
		if (point.at <= cutoff) start = point;
		else break;
	}

	if (start) return historyStart(start);

	const earliest = candidate.history[0];
	return earliest ? historyStart(earliest) : inceptionStart(candidate);
}

export function buildLeaderboardStanding(
	candidate: LeaderboardCandidate,
	range: LeaderboardRange,
	now = Date.now(),
): LeaderboardStanding {
	const totalPnl = candidate.equity - candidate.netContributions;
	const start = leaderboardStartPoint(candidate, range, now);
	const pnl = totalPnl - start.totalPnl;
	// A start snapshot can predate the first deposit. In that case the range
	// began with no capital, so measure the return against current capital
	// instead of dropping the account from the ranking.
	const denominator =
		start.denominator > 0n
			? start.denominator
			: candidate.netContributions > 0n
				? candidate.netContributions
				: candidate.baseline;
	const returnBps = denominator > 0n ? (pnl * 10_000n) / denominator : 0n;
	const totalReturnBps =
		candidate.netContributions > 0n
			? (totalPnl * 10_000n) / candidate.netContributions
			: 0n;

	return {
		userId: candidate.userId,
		createdAt: candidate.createdAt,
		position: 0,
		rank: 0,
		equity: candidate.equity,
		netContributions: candidate.netContributions,
		pnl,
		returnBps,
		totalPnl,
		totalReturnBps,
		startAt: start.at,
		denominator,
	};
}

function compareReturn(left: LeaderboardStanding, right: LeaderboardStanding) {
	const leftScaled = left.pnl * right.denominator;
	const rightScaled = right.pnl * left.denominator;

	return leftScaled < rightScaled ? 1 : leftScaled > rightScaled ? -1 : 0;
}

export function rankLeaderboard(
	candidates: readonly LeaderboardCandidate[],
	range: LeaderboardRange = "all",
	now = Date.now(),
): LeaderboardStanding[] {
	const sorted = candidates
		.map((candidate) => buildLeaderboardStanding(candidate, range, now))
		.filter((standing) => standing.denominator > 0n)
		.sort((left, right) => {
			const returnOrder = compareReturn(left, right);
			if (returnOrder !== 0) return returnOrder;

			if (left.pnl !== right.pnl) return left.pnl > right.pnl ? -1 : 1;
			if (left.equity !== right.equity) return left.equity > right.equity ? -1 : 1;
			if (left.createdAt !== right.createdAt) return left.createdAt - right.createdAt;

			return left.userId.localeCompare(right.userId);
		});

	let currentRank = 1;

	return sorted.map((standing, index) => {
		const previous = sorted[index - 1];
		if (previous && compareReturn(previous, standing) !== 0) currentRank = index + 1;

		return {
			...standing,
			position: index + 1,
			rank: currentRank,
		};
	});
}

function spacingForAge(ageMs: number) {
	if (ageMs < 6 * HOUR) return 10 * MINUTE;
	if (ageMs < DAY) return 30 * MINUTE;
	if (ageMs < 7 * DAY) return 2 * HOUR;
	if (ageMs < 30 * DAY) return 6 * HOUR;

	return 3 * DAY;
}

/**
 * Keep the newest point, then sample backwards at a resolution that gets
 * coarser with age. The oldest point is always retained so all-time charts
 * start where the account started.
 */
export function compactLeaderboardHistory(
	points: readonly LeaderboardHistoryPoint[],
	now = Date.now(),
	maxPoints = MAX_LEADERBOARD_HISTORY_POINTS,
): LeaderboardHistoryPoint[] {
	if (points.length <= 1) return [...points];

	const sorted = [...points].sort((left, right) => left.at - right.at);
	const deduped: LeaderboardHistoryPoint[] = [];

	for (const point of sorted) {
		const previous = deduped[deduped.length - 1];

		if (previous && previous.at === point.at) deduped[deduped.length - 1] = point;
		else deduped.push(point);
	}

	if (deduped.length <= 1) return deduped;

	const newest = deduped[deduped.length - 1]!;
	const earliest = deduped[0]!;
	const kept: LeaderboardHistoryPoint[] = [newest];

	for (let index = deduped.length - 2; index >= 0; index -= 1) {
		const point = deduped[index]!;
		const last = kept[kept.length - 1]!;
		const spacing = spacingForAge(Math.max(0, now - point.at));

		if (last.at - point.at >= spacing) kept.push(point);
		if (kept.length >= maxPoints - 1) break;
	}

	if (kept[kept.length - 1] !== earliest) kept.push(earliest);

	const compacted = kept.reverse();
	return compacted.length > maxPoints
		? downsampleLeaderboardHistory(compacted, maxPoints)
		: compacted;
}

export function appendLeaderboardHistory(
	points: readonly LeaderboardHistoryPoint[],
	point: LeaderboardHistoryPoint,
	now = Date.now(),
): LeaderboardHistoryPoint[] {
	const next = [...points];
	const last = next[next.length - 1];

	if (last && point.at <= last.at) {
		if (point.at === last.at) next[next.length - 1] = point;
		return next;
	}

	next.push(point);
	return next.length > MAX_LEADERBOARD_HISTORY_POINTS
		? compactLeaderboardHistory(next, now)
		: next;
}

export function downsampleLeaderboardHistory(
	points: readonly LeaderboardHistoryPoint[],
	maxPoints = MAX_LEADERBOARD_CHART_POINTS,
): LeaderboardHistoryPoint[] {
	if (points.length <= maxPoints) return [...points];

	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last) return [...points];

	const span = Math.max(1, last.at - first.at);
	const bucketMs = Math.max(1, Math.ceil(span / (maxPoints - 2)));
	const buckets = new Map<number, LeaderboardHistoryPoint>();

	for (const point of points) buckets.set(Math.floor(point.at / bucketMs), point);

	const sampled = [...buckets.values()].sort((left, right) => left.at - right.at);
	if (sampled[0] !== first) sampled.unshift(first);
	if (sampled[sampled.length - 1] !== last) sampled.push(last);

	return sampled;
}

/**
 * Slice history to the requested range, retaining one point before the cutoff
 * so charts do not start halfway through a move.
 */
export function leaderboardHistoryForRange(
	points: readonly LeaderboardHistoryPoint[],
	range: LeaderboardRange,
	now = Date.now(),
	maxPoints = MAX_LEADERBOARD_CHART_POINTS,
): LeaderboardHistoryPoint[] {
	const span = LEADERBOARD_RANGE_MS[range];
	if (span == null) return downsampleLeaderboardHistory(points, maxPoints);

	const cutoff = now - span;
	const windowed = points.filter((point) => point.at >= cutoff);
	let prior: LeaderboardHistoryPoint | null = null;

	for (const point of points) {
		if (point.at < cutoff) prior = point;
		else break;
	}

	return downsampleLeaderboardHistory(
		prior ? [prior, ...windowed] : windowed,
		maxPoints,
	);
}
