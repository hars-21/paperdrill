import { pool } from "./db";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;

const RETENTION_MS = 365 * DAY_MS;
const HOURLY_AFTER_MS = 1 * DAY_MS;
const DAILY_AFTER_MS = 7 * DAY_MS;
const WEEKLY_AFTER_MS = 30 * DAY_MS;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const INITIAL_DELAY_MS = 30 * 1000;

export interface RetentionWindows {
	/** Snapshots older than this are removed entirely. */
	cutoff: Date;
	/** Snapshots older than this keep one row per hour. */
	hourlyBefore: Date;
	/** Snapshots older than this keep one row per day. */
	dailyBefore: Date;
	/** Snapshots older than this keep one row per week. */
	weeklyBefore: Date;
}

/**
 * Resolution tiers for persisted portfolio snapshots. Recent activity keeps
 * every minute so the 24h chart is exact; older rows are thinned so a year of
 * history stays bounded at roughly 1.7k rows per user.
 */
export function retentionWindows(now: number): RetentionWindows {
	return {
		cutoff: new Date(now - RETENTION_MS),
		hourlyBefore: new Date(now - HOURLY_AFTER_MS),
		dailyBefore: new Date(now - DAILY_AFTER_MS),
		weeklyBefore: new Date(now - WEEKLY_AFTER_MS),
	};
}

const THIN_SQL = `
	WITH grouped AS (
		SELECT
			id,
			row_number() OVER (
				PARTITION BY "userId",
					CASE
						WHEN at >= $3 THEN date_trunc('hour', at)
						WHEN at >= $4 THEN date_trunc('day', at)
						ELSE date_trunc('week', at)
					END
				ORDER BY at DESC
			) AS rn
		FROM "PortfolioSnapshot"
		WHERE at >= $1 AND at < $2
	)
	DELETE FROM "PortfolioSnapshot" AS snapshot
	USING grouped
	WHERE snapshot.id = grouped.id AND grouped.rn > 1
`;

/**
 * Delete expired snapshots, then collapse the remaining history into hourly,
 * daily, and weekly buckets. The same bucketing also runs when the history
 * endpoint downsamples a response, so charts keep their shape.
 */
export async function prunePortfolioSnapshots(now = Date.now()) {
	const windows = retentionWindows(now);

	const expired = await pool.query(
		`DELETE FROM "PortfolioSnapshot" WHERE at < $1`,
		[windows.cutoff],
	);

	const thinned = await pool.query(THIN_SQL, [
		windows.cutoff,
		windows.hourlyBefore,
		windows.dailyBefore,
		windows.weeklyBefore,
	]);

	if ((expired.rowCount ?? 0) > 0 || (thinned.rowCount ?? 0) > 0) {
		logger.info("Pruned portfolio snapshots", {
			expired: expired.rowCount ?? 0,
			thinned: thinned.rowCount ?? 0,
		});
	}
}

let timer: ReturnType<typeof setInterval> | null = null;
let initial: ReturnType<typeof setTimeout> | null = null;

function run() {
	void prunePortfolioSnapshots().catch((err) => {
		logger.error("Failed to prune portfolio snapshots", err);
	});
}

export function startPortfolioRetention() {
	if (timer) return;

	initial = setTimeout(run, INITIAL_DELAY_MS);
	initial.unref?.();

	timer = setInterval(run, PRUNE_INTERVAL_MS);
	timer.unref?.();
}

export function stopPortfolioRetention() {
	if (initial) clearTimeout(initial);
	if (timer) clearInterval(timer);
	initial = null;
	timer = null;
}
