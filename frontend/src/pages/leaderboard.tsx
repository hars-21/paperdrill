import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Page, PageContent, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
	LeaderboardEntry,
	LeaderboardResponse,
	MyLeaderboardResponse,
} from "@/types";
import { formatChange, formatDateTime, formatPrice } from "@/utils/format";

const PAGE_SIZE = 25;
const REFRESH_INTERVAL = 60_000;

export function LeaderboardPage() {
	const { authenticated } = useAuth();
	const [page, setPage] = useState(1);
	const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
	const [mine, setMine] = useState<MyLeaderboardResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const offset = (page - 1) * PAGE_SIZE;

	const load = useCallback(
		async (showLoading = false) => {
			if (showLoading) setLoading(true);

			try {
				const data = await api.getLeaderboard(PAGE_SIZE, offset);
				setLeaderboard(data);
				setError(null);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Failed to load leaderboard");
			} finally {
				setLoading(false);
			}

			if (!authenticated) {
				setMine(null);
				return;
			}

			try {
				setMine(await api.getMyLeaderboardEntry());
			} catch {
				setMine(null);
			}
		},
		[authenticated, offset],
	);

	useEffect(() => {
		void load(true);
		const interval = window.setInterval(() => void load(), REFRESH_INTERVAL);
		const handleVisibility = () => {
			if (document.visibilityState === "visible") void load();
		};
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [load]);

	const total = leaderboard?.pagination.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const firstVisible = total === 0 ? 0 : offset + 1;
	const lastVisible = Math.min(offset + PAGE_SIZE, total);
	const myEntry = mine?.eligible ? mine.entry : null;
	const rows = leaderboard?.entries ?? [];

	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-high-emphasis">Leaderboard</h1>
					<p className="mt-1 text-sm text-medium-emphasis">
						Global standings ranked by all-time portfolio return.
					</p>
				</div>
			</PageHeader>

			<PageContent className="max-w-5xl">
				{mine?.eligible ? (
					<PersonalStanding entry={mine.entry} quoteAsset={mine.quoteAsset} />
				) : mine ? (
					<EligibilityMessage reason={mine.reason} />
				) : null}

				<div className="overflow-hidden rounded-xl border border-border/60 bg-l1">
					<div className="flex min-h-13 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border/40 px-4 py-3 sm:px-5">
						<div className="flex items-baseline gap-2">
							<h2 className="text-sm font-semibold text-high-emphasis">Standings</h2>
							{leaderboard && (
								<span className="text-xs tabular-nums text-medium-emphasis">
									{total} {total === 1 ? "trader" : "traders"}
								</span>
							)}
						</div>
						{leaderboard && (
							<p className="text-xs text-medium-emphasis">
								Updated {formatDateTime(leaderboard.asOf)}
							</p>
						)}
					</div>

					{leaderboard?.stale && (
						<div className="border-b border-border/40 bg-l2 px-4 py-2.5 text-xs text-medium-emphasis sm:px-5">
							Updates are delayed. Showing the latest completed standings.
						</div>
					)}

					{error && leaderboard && (
						<div className="border-b border-border/40 px-4 py-2.5 text-xs text-red-text sm:px-5">
							The latest standings could not be loaded. Existing results are still shown.
						</div>
					)}

					{loading ? (
						<LeaderboardSkeleton />
					) : !leaderboard ? (
						<UnavailableState error={error} onRetry={() => void load(true)} />
					) : rows.length === 0 ? (
						<EmptyState />
					) : (
						<LeaderboardTable
							entries={rows}
							quoteAsset={leaderboard.quoteAsset}
							myPosition={myEntry?.position}
						/>
					)}

					{leaderboard && total > PAGE_SIZE && (
						<div className="flex items-center justify-between border-t border-border/40 px-4 py-3 sm:px-5">
							<p className="text-xs tabular-nums text-medium-emphasis">
								{firstVisible}–{lastVisible} of {total}
							</p>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={page === 1}
									onClick={() => setPage((current) => Math.max(1, current - 1))}
									aria-label="Previous page"
								>
									<ChevronLeft />
								</Button>
								<span className="min-w-14 text-center text-xs tabular-nums text-medium-emphasis">
									{page} / {totalPages}
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={page === totalPages}
									onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
									aria-label="Next page"
								>
									<ChevronRight />
								</Button>
							</div>
						</div>
					)}
				</div>
			</PageContent>
		</Page>
	);
}

function LeaderboardTable({ entries, quoteAsset, myPosition }: { entries: LeaderboardEntry[]; quoteAsset: string; myPosition?: number }) {
	return (
		<Table className="table-fixed">
			<TableHeader>
				<TableRow className="bg-l2/60 hover:bg-l2/60">
					<TableHead className="w-16 px-4 sm:w-20 sm:px-5">Rank</TableHead>
					<TableHead>Trader</TableHead>
					<TableHead className="w-24 px-4 text-right sm:w-28">Return</TableHead>
					<TableHead className="hidden w-40 text-right sm:table-cell">PnL</TableHead>
					<TableHead className="hidden w-44 px-5 text-right md:table-cell">Portfolio</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{entries.map((entry) => (
					<LeaderboardTableRow key={entry.position} entry={entry} quoteAsset={quoteAsset} current={entry.position === myPosition} />
				))}
			</TableBody>
		</Table>
	);
}

function LeaderboardTableRow({ entry, quoteAsset, current }: { entry: LeaderboardEntry; quoteAsset: string; current: boolean }) {
	const pnl = Number(entry.pnl);
	const change = formatChange(entry.pnlPercent);

	return (
		<TableRow className={cn(entry.rank <= 3 && "bg-l2/25", current && "bg-l3/45 hover:bg-l3/60")}>
			<TableCell className="px-4 py-4 font-semibold text-high-emphasis sm:px-5">{entry.rank}</TableCell>
			<TableCell className="min-w-0">
				<div className="flex min-w-0 items-baseline gap-2">
					<span className="truncate font-medium text-high-emphasis">{entry.name}</span>
					{current && <span className="shrink-0 text-xs text-medium-emphasis">You</span>}
				</div>
			</TableCell>
			<TableCell className={cn("px-4 text-right font-semibold whitespace-nowrap", valueTone(entry.pnlPercent))}>
				{change.text}
			</TableCell>
			<TableCell className={cn("hidden text-right font-medium whitespace-nowrap sm:table-cell", valueTone(entry.pnl))}>
				{pnl > 0 ? "+" : ""}{formatPrice(entry.pnl)} {quoteAsset}
			</TableCell>
			<TableCell className="hidden px-5 text-right font-medium whitespace-nowrap md:table-cell">
				{formatPrice(entry.equity)} {quoteAsset}
			</TableCell>
		</TableRow>
	);
}

function PersonalStanding({ entry, quoteAsset }: { entry: LeaderboardEntry; quoteAsset: string }) {
	const pnl = Number(entry.pnl);
	const change = formatChange(entry.pnlPercent);

	return (
		<section aria-label="Your standing" className="overflow-hidden rounded-xl border border-border/60 bg-l1">
			<div className="grid grid-cols-2 sm:grid-cols-4">
				<StandingMetric label="Your rank" value={`#${entry.rank}`} />
				<StandingMetric label="Return" value={change.text} className={valueTone(entry.pnlPercent)} />
				<StandingMetric label="PnL" value={`${pnl > 0 ? "+" : ""}${formatPrice(entry.pnl)} ${quoteAsset}`} className={valueTone(entry.pnl)} />
				<StandingMetric label="Portfolio" value={`${formatPrice(entry.equity)} ${quoteAsset}`} />
			</div>
		</section>
	);
}

function StandingMetric({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="border-b border-border/40 px-4 py-4 odd:border-r last:border-b-0 sm:border-r sm:border-b-0 sm:px-5 sm:last:border-r-0">
			<p className="text-xs text-medium-emphasis">{label}</p>
			<p className={cn("mt-1 truncate text-base font-semibold tabular-nums text-high-emphasis", className)}>{value}</p>
		</div>
	);
}

function EligibilityMessage({ reason }: { reason: "EMAIL_NOT_VERIFIED" | "NO_TRADES" | "NOT_CALCULATED" }) {
	const content = reason === "EMAIL_NOT_VERIFIED"
		? { text: "Verify your email to join the leaderboard.", to: "/verify-email", action: "Verify email" }
		: reason === "NO_TRADES"
			? { text: "Complete your first trade to join the leaderboard.", to: "/trade/BTC_USD", action: "Start trading" }
			: null;

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-l1 px-4 py-3 sm:px-5">
			<p className="text-sm text-medium-emphasis">{content?.text ?? "Your standing will appear after the next leaderboard update."}</p>
			{content && (
				<Button asChild variant="secondary" size="sm">
					<Link to={content.to}>{content.action}</Link>
				</Button>
			)}
		</div>
	);
}

function UnavailableState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
	return (
		<div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
			<Trophy className="size-7 text-low-emphasis" />
			<p className="mt-3 font-medium text-high-emphasis">Leaderboard unavailable</p>
			<p className="mt-1 max-w-md text-sm text-medium-emphasis">{error ?? "The first standings are still being calculated."}</p>
			<Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
			<Trophy className="size-7 text-low-emphasis" />
			<p className="mt-3 font-medium text-high-emphasis">No ranked traders yet</p>
			<p className="mt-1 text-sm text-medium-emphasis">Verify your account and complete a trade to enter the standings.</p>
			<Button asChild className="mt-4" variant="secondary" size="sm"><Link to="/trade/BTC_USD">Start trading</Link></Button>
		</div>
	);
}

function LeaderboardSkeleton() {
	return (
		<Table className="table-fixed">
			<TableHeader>
				<TableRow className="bg-l2/60 hover:bg-l2/60">
					<TableHead className="w-16 px-4 sm:w-20 sm:px-5">Rank</TableHead>
					<TableHead>Trader</TableHead>
					<TableHead className="w-24 px-4 text-right sm:w-28">Return</TableHead>
					<TableHead className="hidden w-40 text-right sm:table-cell">PnL</TableHead>
					<TableHead className="hidden w-44 px-5 text-right md:table-cell">Portfolio</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 10 }).map((_, index) => (
					<TableRow key={index}>
						<TableCell className="px-4 py-4 sm:px-5"><Skeleton className="h-4 w-5" /></TableCell>
						<TableCell><Skeleton className="h-4 w-24" /></TableCell>
						<TableCell className="px-4"><Skeleton className="ml-auto h-4 w-14" /></TableCell>
						<TableCell className="hidden sm:table-cell"><Skeleton className="ml-auto h-4 w-24" /></TableCell>
						<TableCell className="hidden px-5 md:table-cell"><Skeleton className="ml-auto h-4 w-28" /></TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function valueTone(value: string) {
	const numeric = Number(value);
	if (numeric > 0) return "text-green-text";
	if (numeric < 0) return "text-red-text";
	return "text-high-emphasis";
}
