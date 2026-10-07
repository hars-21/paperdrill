import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FeedbackState, InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent, PageHeader, PageHeading } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getLastTradePath } from "@/lib/ux-preferences";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardResponse, MyLeaderboardResponse } from "@/types";
import { formatChange, formatDateTime, formatPrice } from "@/utils/format";

const PAGE_SIZE = 25;
const REFRESH_INTERVAL = 60_000;

export function LeaderboardPage() {
	const { authenticated } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();
	const pageParam = Number(searchParams.get("page"));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const setPage = useCallback(
		(nextPage: number) => {
			setSearchParams((current) => {
				const next = new URLSearchParams(current);
				if (nextPage <= 1) next.delete("page");
				else next.set("page", String(nextPage));
				return next;
			});
		},
		[setSearchParams],
	);
	const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
	const [mine, setMine] = useState<MyLeaderboardResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const offset = (page - 1) * PAGE_SIZE;

	const load = useCallback(
		async (showLoading = false) => {
			if (showLoading) setLoading(true);

			const personalRequest = authenticated
				? api.getMyLeaderboardEntry().catch(() => null)
				: Promise.resolve(null);

			try {
				const [data, personal] = await Promise.all([
					api.getLeaderboard(PAGE_SIZE, offset),
					personalRequest,
				]);
				setLeaderboard(data);
				setMine(personal);
				setError(null);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Failed to load leaderboard");
			} finally {
				setLoading(false);
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
	const podiumEntries = page === 1 ? rows.slice(0, 3) : [];
	const rankingEntries = page === 1 ? rows.slice(3) : rows;

	useEffect(() => {
		if (leaderboard && page > totalPages) setPage(totalPages);
	}, [leaderboard, page, setPage, totalPages]);

	return (
		<Page>
			<PageHeader className="max-w-7xl">
				<PageHeading
					title="Leaderboard"
					description="Global standings ranked by all-time portfolio return."
				/>
			</PageHeader>

			<PageContent className="max-w-7xl space-y-5">
				{mine?.eligible ? (
					<PersonalStanding entry={mine.entry} quoteAsset={mine.quoteAsset} />
				) : mine ? (
					<EligibilityMessage reason={mine.reason} />
				) : null}

				{leaderboard?.stale ? (
					<InlineNotice className="rounded-xl border border-border/60">
						Updates are delayed. Showing the latest completed standings.
					</InlineNotice>
				) : null}

				{error && leaderboard ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						The latest standings could not be loaded. Existing results are still shown.
					</InlineNotice>
				) : null}

				{loading ? (
					<LeaderboardSkeleton />
				) : !leaderboard ? (
					<Surface className="rounded-xl shadow-sm">
						<UnavailableState error={error} onRetry={() => void load(true)} />
					</Surface>
				) : rows.length === 0 ? (
					<Surface className="rounded-xl shadow-sm">
						<EmptyState />
					</Surface>
				) : (
					<>
						{podiumEntries.length > 0 ? (
							<Podium
								entries={podiumEntries}
								quoteAsset={leaderboard.quoteAsset}
								myPosition={myEntry?.position}
							/>
						) : null}

						<RankingsPanel
							entries={rankingEntries}
							quoteAsset={leaderboard.quoteAsset}
							myPosition={myEntry?.position}
							total={total}
							asOf={leaderboard.asOf}
							page={page}
							totalPages={totalPages}
							firstVisible={firstVisible}
							lastVisible={lastVisible}
							onPageChange={setPage}
						/>
					</>
				)}
			</PageContent>
		</Page>
	);
}

function Podium({
	entries,
	quoteAsset,
	myPosition,
}: {
	entries: LeaderboardEntry[];
	quoteAsset: string;
	myPosition?: number;
}) {
	const champion = entries[0];
	if (!champion) return null;
	const runners = entries.slice(1);

	return (
		<section aria-labelledby="podium-heading">
			<h2 id="podium-heading" className="sr-only">
				Leading traders
			</h2>
			<Surface
				className={cn(
					"grid overflow-hidden rounded-xl shadow-sm",
					runners.length > 0 && "md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]",
				)}
			>
				<Champion
					entry={champion}
					quoteAsset={quoteAsset}
					current={champion.position === myPosition}
				/>
				{runners.length > 0 ? (
					<div className="divide-y divide-border/40 border-t border-border/40 md:border-t-0 md:border-l">
						{runners.map((entry) => (
							<Runner
								key={entry.position}
								entry={entry}
								quoteAsset={quoteAsset}
								current={entry.position === myPosition}
							/>
						))}
					</div>
				) : null}
			</Surface>
		</section>
	);
}

function Champion({
	entry,
	quoteAsset,
	current,
}: {
	entry: LeaderboardEntry;
	quoteAsset: string;
	current: boolean;
}) {
	const pnl = Number(entry.pnl);
	const change = formatChange(entry.pnlPercent);

	return (
		<div className={cn("relative flex min-h-72 flex-col bg-l2/35 p-5 sm:p-7", current && "bg-l2")}>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2 text-sm font-medium text-medium-emphasis">
					<Trophy className="size-4 text-primary" aria-hidden="true" />
					<span>Rank #{entry.rank}</span>
				</div>
				{current ? <span className="text-xs font-medium text-primary">Your position</span> : null}
			</div>

			<div className="my-auto flex items-center gap-4 py-8">
				<TraderAvatar
					entry={entry}
					className="size-16 border-2 sm:size-20"
					fallbackClassName="text-xl sm:text-2xl"
				/>
				<div className="min-w-0">
					<p className="truncate text-xl font-semibold tracking-tight text-high-emphasis sm:text-2xl">
						{entry.name}
					</p>
					<p
						className={cn(
							"mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl",
							valueTone(entry.pnlPercent),
						)}
					>
						{change.text}
					</p>
					<p className="mt-1 text-xs text-medium-emphasis">All-time return</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
				<StandingMetric
					label="PnL"
					value={`${pnl > 0 ? "+" : ""}${formatPrice(entry.pnl)} ${quoteAsset}`}
					valueClassName={valueTone(entry.pnl)}
				/>
				<StandingMetric label="Portfolio" value={`${formatPrice(entry.equity)} ${quoteAsset}`} />
			</div>
		</div>
	);
}

function Runner({
	entry,
	quoteAsset,
	current,
}: {
	entry: LeaderboardEntry;
	quoteAsset: string;
	current: boolean;
}) {
	const pnl = Number(entry.pnl);
	const change = formatChange(entry.pnlPercent);

	return (
		<div className={cn("flex min-h-36 flex-col justify-center p-5", current && "bg-l2")}>
			<div className="flex items-center gap-3">
				<span className="w-8 shrink-0 text-xl font-semibold text-low-emphasis tabular-nums">
					#{entry.rank}
				</span>
				<TraderAvatar entry={entry} className="size-11 border" fallbackClassName="text-sm" />
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="truncate font-semibold text-high-emphasis">{entry.name}</p>
						{current ? <span className="shrink-0 text-xs text-primary">You</span> : null}
					</div>
					<p className="mt-0.5 text-xs text-medium-emphasis tabular-nums">
						{pnl > 0 ? "+" : ""}
						{formatPrice(entry.pnl)} {quoteAsset} PnL
					</p>
				</div>
				<p
					className={cn("shrink-0 text-lg font-semibold tabular-nums", valueTone(entry.pnlPercent))}
				>
					{change.text}
				</p>
			</div>
		</div>
	);
}

function RankingsPanel({
	entries,
	quoteAsset,
	myPosition,
	total,
	asOf,
	page,
	totalPages,
	firstVisible,
	lastVisible,
	onPageChange,
}: {
	entries: LeaderboardEntry[];
	quoteAsset: string;
	myPosition?: number;
	total: number;
	asOf: string;
	page: number;
	totalPages: number;
	firstVisible: number;
	lastVisible: number;
	onPageChange: (page: number) => void;
}) {
	return (
		<section aria-labelledby="rankings-heading">
			<Surface className="rounded-xl shadow-sm">
				<div className="flex flex-col gap-1 border-b border-border/40 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
					<div>
						<div className="flex items-baseline gap-2">
							<h2 id="rankings-heading" className="font-semibold text-high-emphasis">
								Rankings
							</h2>
						</div>
						<p className="mt-1 text-xs text-medium-emphasis">Updated {formatDateTime(asOf)}</p>
					</div>
					<p className="text-xs text-medium-emphasis">Return determines rank</p>
				</div>

				<div className="hidden grid-cols-[3rem_minmax(0,1fr)_7rem_9rem_10rem] items-center gap-3 border-b border-border/40 bg-l2/50 px-4 py-2.5 text-xs text-medium-emphasis sm:grid sm:px-5">
					<span>Rank</span>
					<span>Trader</span>
					<span className="text-right">Return</span>
					<span className="text-right">PnL ({quoteAsset})</span>
					<span className="text-right">Portfolio ({quoteAsset})</span>
				</div>

				{entries.length > 0 ? (
					<ol>
						{entries.map((entry) => (
							<RankingRow
								key={entry.position}
								entry={entry}
								quoteAsset={quoteAsset}
								current={entry.position === myPosition}
							/>
						))}
					</ol>
				) : (
					<p className="px-5 py-8 text-center text-sm text-medium-emphasis">
						The full ranking will grow as more traders qualify.
					</p>
				)}

				{total > PAGE_SIZE ? (
					<div className="flex items-center justify-between border-t border-border/40 px-4 py-3 sm:px-5">
						<p className="text-xs tabular-nums text-medium-emphasis">
							{firstVisible}-{lastVisible} of {total}
						</p>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={page === 1}
								onClick={() => onPageChange(Math.max(1, page - 1))}
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
								onClick={() => onPageChange(Math.min(totalPages, page + 1))}
								aria-label="Next page"
							>
								<ChevronRight />
							</Button>
						</div>
					</div>
				) : null}
			</Surface>
		</section>
	);
}

function RankingRow({
	entry,
	quoteAsset,
	current,
}: {
	entry: LeaderboardEntry;
	quoteAsset: string;
	current: boolean;
}) {
	const pnl = Number(entry.pnl);
	const change = formatChange(entry.pnlPercent);

	return (
		<li
			className={cn(
				"grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-l2/40 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_9rem_10rem] sm:px-5",
				current && "border-l-2 border-primary bg-l2 pl-3.5 sm:pl-4.5",
			)}
		>
			<span className="font-semibold text-medium-emphasis tabular-nums">#{entry.rank}</span>
			<div className="flex min-w-0 items-center gap-3">
				<TraderAvatar entry={entry} className="size-9 border" fallbackClassName="text-xs" />
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<p className="truncate font-medium text-high-emphasis">{entry.name}</p>
						{current ? <span className="shrink-0 text-xs text-primary">You</span> : null}
					</div>
					<p className="mt-0.5 truncate text-xs text-medium-emphasis sm:hidden">
						Portfolio {formatPrice(entry.equity)} {quoteAsset}
					</p>
				</div>
			</div>
			<div className="text-right">
				<p className={cn("font-semibold tabular-nums", valueTone(entry.pnlPercent))}>
					{change.text}
				</p>
				<p className={cn("mt-0.5 text-xs tabular-nums sm:hidden", valueTone(entry.pnl))}>
					{pnl > 0 ? "+" : ""}
					{formatPrice(entry.pnl)}
				</p>
			</div>
			<p
				className={cn(
					"hidden text-right text-sm font-medium tabular-nums sm:block",
					valueTone(entry.pnl),
				)}
			>
				{pnl > 0 ? "+" : ""}
				{formatPrice(entry.pnl)}
			</p>
			<p className="hidden text-right text-sm font-medium text-high-emphasis tabular-nums sm:block">
				{formatPrice(entry.equity)}
			</p>
		</li>
	);
}

function PersonalStanding({ entry, quoteAsset }: { entry: LeaderboardEntry; quoteAsset: string }) {
	const pnl = Number(entry.pnl);
	const change = formatChange(entry.pnlPercent);

	return (
		<Surface className="grid overflow-hidden rounded-xl shadow-sm sm:grid-cols-[minmax(13rem,1.35fr)_repeat(3,minmax(8rem,1fr))]">
			<div className="flex items-center gap-3 bg-l2/50 px-4 py-4 sm:px-5">
				<TraderAvatar entry={entry} className="size-11 border" fallbackClassName="text-sm" />
				<div className="min-w-0">
					<p className="text-xs text-medium-emphasis">Your standing</p>
					<p className="mt-0.5 truncate font-semibold text-high-emphasis">{entry.name}</p>
				</div>
			</div>
			<StandingMetric
				className="border-t sm:border-t-0 sm:border-l"
				label="Rank"
				value={`#${entry.rank}`}
			/>
			<StandingMetric
				className="border-t sm:border-t-0 sm:border-l"
				label="Return"
				value={change.text}
				valueClassName={valueTone(entry.pnlPercent)}
			/>
			<StandingMetric
				className="border-t sm:border-t-0 sm:border-l"
				label="PnL"
				value={`${pnl > 0 ? "+" : ""}${formatPrice(entry.pnl)} ${quoteAsset}`}
				valueClassName={valueTone(entry.pnl)}
			/>
		</Surface>
	);
}

function StandingMetric({
	label,
	value,
	valueClassName,
	className,
}: {
	label: string;
	value: string;
	valueClassName?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col justify-center px-4 py-3 sm:px-5", className)}>
			<p className="text-xs text-medium-emphasis">{label}</p>
			<p
				className={cn(
					"mt-1 truncate font-semibold text-high-emphasis tabular-nums",
					valueClassName,
				)}
			>
				{value}
			</p>
		</div>
	);
}

function TraderAvatar({
	entry,
	className,
	fallbackClassName,
}: {
	entry: LeaderboardEntry;
	className?: string;
	fallbackClassName?: string;
}) {
	return (
		<Avatar className={cn("border-border/60 bg-l2", className)}>
			{entry.avatarUrl ? (
				<AvatarImage src={entry.avatarUrl} alt="" className="object-cover" />
			) : null}
			<AvatarFallback className={cn("bg-l2 font-semibold text-medium-emphasis", fallbackClassName)}>
				{initials(entry.name)}
			</AvatarFallback>
		</Avatar>
	);
}

function initials(name: string) {
	return (
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "T"
	);
}

function EligibilityMessage({
	reason,
}: {
	reason: "EMAIL_NOT_VERIFIED" | "NO_TRADES" | "NOT_CALCULATED";
}) {
	const content =
		reason === "EMAIL_NOT_VERIFIED"
			? {
					text: "Verify your email to join the leaderboard.",
					to: "/verify-email",
					action: "Verify email",
				}
			: reason === "NO_TRADES"
				? {
						text: "Complete your first trade to join the leaderboard.",
						to: getLastTradePath(),
						action: "Start trading",
					}
				: null;

	return (
		<Surface className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-sm sm:px-5">
			<p className="text-sm text-medium-emphasis">
				{content?.text ?? "Your standing will appear after the next leaderboard update."}
			</p>
			{content ? (
				<Button asChild variant="secondary" size="sm">
					<Link to={content.to}>{content.action}</Link>
				</Button>
			) : null}
		</Surface>
	);
}

function UnavailableState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
	return (
		<FeedbackState
			className="min-h-80"
			icon={Trophy}
			title="Leaderboard unavailable"
			description={error ?? "The first standings are still being calculated."}
			action={
				<Button variant="secondary" size="sm" onClick={onRetry}>
					Try again
				</Button>
			}
		/>
	);
}

function EmptyState() {
	return (
		<FeedbackState
			className="min-h-80"
			icon={Trophy}
			title="No ranked traders yet"
			description="Verify your account and complete a trade to enter the standings."
			action={
				<Button asChild variant="secondary" size="sm">
					<Link to={getLastTradePath()}>Start trading</Link>
				</Button>
			}
		/>
	);
}

function LeaderboardSkeleton() {
	return (
		<div className="space-y-5">
			<Surface className="grid overflow-hidden rounded-xl shadow-sm md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
				<div className="min-h-72 bg-l2/35 p-6">
					<Skeleton className="h-4 w-20" />
					<div className="flex items-center gap-4 py-12">
						<Skeleton className="size-16 rounded-full" />
						<div className="space-y-3">
							<Skeleton className="h-5 w-36" />
							<Skeleton className="h-9 w-28" />
						</div>
					</div>
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="divide-y divide-border/40 border-t border-border/40 md:border-t-0 md:border-l">
					{Array.from({ length: 2 }).map((_, index) => (
						<div key={index} className="flex min-h-36 items-center gap-3 p-5">
							<Skeleton className="h-6 w-8" />
							<Skeleton className="size-11 rounded-full" />
							<Skeleton className="h-5 flex-1" />
							<Skeleton className="h-5 w-16" />
						</div>
					))}
				</div>
			</Surface>

			<Surface className="rounded-xl p-4 shadow-sm sm:p-5">
				<Skeleton className="h-5 w-32" />
				<div className="mt-5 space-y-3">
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton key={index} className="h-12 w-full" />
					))}
				</div>
			</Surface>
		</div>
	);
}

function valueTone(value: string) {
	const numeric = Number(value);
	if (numeric > 0) return "text-green-text";
	if (numeric < 0) return "text-red-text";
	return "text-high-emphasis";
}
