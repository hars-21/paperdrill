export interface LeaderboardCandidate {
	userId: string;
	createdAt: Date;
	baseline: bigint;
	equity: bigint;
}

export interface RankedLeaderboardEntry extends LeaderboardCandidate {
	position: number;
	rank: number;
	pnl: bigint;
}

export function isLeaderboardStale(asOf: Date, now = Date.now(), refreshMs = 60_000) {
	return now - asOf.getTime() > refreshMs * 2;
}

function compareReturn(left: LeaderboardCandidate, right: LeaderboardCandidate) {
	const leftPnl = left.equity - left.baseline;
	const rightPnl = right.equity - right.baseline;
	const leftRatio = leftPnl * right.baseline;
	const rightRatio = rightPnl * left.baseline;

	return leftRatio < rightRatio ? 1 : leftRatio > rightRatio ? -1 : 0;
}

export function rankLeaderboard(candidates: LeaderboardCandidate[]): RankedLeaderboardEntry[] {
	const sorted = candidates
		.filter((candidate) => candidate.baseline > 0n)
		.sort((left, right) => {
			const returnOrder = compareReturn(left, right);
			if (returnOrder !== 0) return returnOrder;

			const leftPnl = left.equity - left.baseline;
			const rightPnl = right.equity - right.baseline;
			if (leftPnl !== rightPnl) return leftPnl > rightPnl ? -1 : 1;
			if (left.equity !== right.equity) return left.equity > right.equity ? -1 : 1;

			const createdOrder = left.createdAt.getTime() - right.createdAt.getTime();
			return createdOrder || left.userId.localeCompare(right.userId);
		});

	let currentRank = 1;
	return sorted.map((candidate, index) => {
		const previous = sorted[index - 1];
		if (previous && compareReturn(previous, candidate) !== 0) currentRank = index + 1;

		return {
			...candidate,
			position: index + 1,
			rank: currentRank,
			pnl: candidate.equity - candidate.baseline,
		};
	});
}
