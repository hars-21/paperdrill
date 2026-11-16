import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
	LeaderboardHistoryChart,
	LeaderboardSparkline,
} from "@/components/leaderboard/leaderboard-chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FeedbackState, InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent, PageHeader, PageHeading } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/context/AuthContext";
import {
	useLeaderboard,
	useLeaderboardStream,
	useMyLeaderboard,
} from "@/hooks/use-leaderboard";
import { getLastTradePath } from "@/lib/ux-preferences";
import { cn } from "@/lib/utils";
import type {
	LeaderboardEntry,
	LeaderboardRange,
	MyLeaderboardResponse,
} from "@/types";
import { formatChange, formatDateTime, formatPrice } from "@/utils/format";

const PAGE_SIZE = 25;

const RANGES: { value: LeaderboardRange; label: string; description: string }[] = [
	{ value: "24h", label: "24H", description: "24-hour return" },
	{ value: "7d", label: "7D", description: "7-day return" },
	{ value: "30d", label: "30D", description: "30-day return" },
	{ value: "all", label: "All", description: "All-time return" },
];

const PERIOD: Record<LeaderboardRange, string> = {
	"24h": "24-hour",
	"7d": "7-day",
	"30d": "30-day",
	all: "all-time",
};

function isRange(value: string | null): value is LeaderboardRange {
	return value === "24h" || value === "7d" || value === "30d" || value === "all";
}

export function LeaderboardPage() {
	const { authenticated } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();
	const rangeParam = searchParams.get("range");
	const range: LeaderboardRange = isRange(rangeParam) ? rangeParam : "all";
	const pageParam = Number(searchParams.get("page"));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const { leaderboard, loading, fetching, error, refresh } = useLeaderboard(range, page);
	const { mine, loading: mineLoading } = useMyLeaderboard(range);
	useLeaderboardStream();

	const setRange = useCallback(
		(nextRange: LeaderboardRange) => {
			setSearchParams((current) => {
				const next = new URLSearchParams(current);
				if (nextRange === "all") next.delete("range");
				else next.set("range", nextRange);
				next.delete("page");
				return next;
			});
		},
		[setSearchParams],
	);

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

	const total = leaderboard?.pagination.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const offset = (page - 1) * PAGE_SIZE;
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
					description="Live standings ranked by portfolio performance. Deposits and credits are excluded from returns."
					action={
						<div className="flex flex-col items-start gap-2 sm:items-end">
							<RangeTabs value={range} onChange={setRange} />
							<LiveStatus
								asOf={leaderboard?.asOf ?? null}
								syncing={fetching && !loading}
							/>
						</div>
					}
				/>
			</PageHeader>

			<PageContent className="max-w-7xl space-y-5">
				{authenticated ? (
					<PersonalStanding
						mine={mine}
						loading={mineLoading}
						range={range}
						quoteAsset={leaderboard?.quoteAsset ?? "USD"}
					/>
				) : null}

				{error && leaderboard ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						Live updates paused. Showing the latest standings we received.
					</InlineNotice>
				) : null}

				{loading ? (
					<LeaderboardSkeleton />
				) : !leaderboard ? (
					<Surface className="rounded-xl shadow-sm">
						<UnavailableState error={error} onRetry={() => void refresh()} />
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
								range={range}
								quoteAsset={leaderboard.quoteAsset}
								currentUserId={myEntry?.userId}
							/>
						) : null}

						<RankingsPanel
							entries={rankingEntries}
							range={range}
							quoteAsset={leaderboard.quoteAsset}
							currentUserId={myEntry?.userId}
							total={total}
							asOf={leaderboard.asOf}
							fetching={fetching}
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

function RangeTabs({
	value,
	onChange,
}: {
	value: LeaderboardRange;
	onChange: (range: LeaderboardRange) => void;
}) {
	return (
		<div
			role="group"
			aria-label="Leaderboard time range"
			className="inline-flex flex-wrap rounded-lg border border-border/60 bg-l1 p-0.5"
		>
			{RANGES.map((range) => (
				<button
					key={range.value}
					type="button"
					aria-pressed={value === range.value}
					title={range.description}
					onClick={() => onChange(range.value)}
					className={cn(
						"rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
						value === range.value
							? "bg-l2 text-high-emphasis shadow-sm"
							: "text-medium-emphasis hover:text-high-emphasis",
					)}
				>
					{range.label}
				</button>
			))}
		</div>
	);
}

function LiveStatus({ asOf, syncing }: { asOf: string | null; syncing: boolean }) {
	return (
		<span className="inline-flex items-center gap-2 text-xs text-medium-emphasis">
			<span className="relative flex size-2" aria-hidden="true">
				<span className="absolute inline-flex size-full rounded-full bg-green-text/50 motion-safe:animate-ping" />
				<span className="relative inline-flex size-2 rounded-full bg-green-text" />
			</span>
			<span>{syncing ? "Syncing" : "Live"}</span>
			{asOf ? (
				<span className="text-low-emphasis">· Updated {formatDateTime(asOf)}</span>
			) : null}
		</span>
	);
}

function Podium({
	entries,
	range,
	quoteAsset,
	currentUserId,
}: {
	entries: LeaderboardEntry[];
	range: LeaderboardRange;
	quoteAsset: string;
	currentUserId?: string;
}) {
	return (
		<section aria-labelledby="podium-heading">
			<h2 id="podium-heading" className="sr-only">
				Leading traders
			</h2>
			<div className="grid items-stretch gap-3 lg:grid-cols-[1.35fr_1fr_1fr]">
				{entries.map((entry, index) => (
					<PodiumCard
						key={entry.userId}
						entry={entry}
						range={range}
						quoteAsset={quoteAsset}
						current={entry.userId === currentUserId}
						featured={index === 0}
					/>
				))}
			</div>
		</section>
	);
}

function PodiumCard({
	entry,
	range,
	quoteAsset,
	current,
	featured,
}: {
	entry: LeaderboardEntry;
	range: LeaderboardRange;
	quoteAsset: string;
	current: boolean;
	featured: boolean;
}) {
	const change = formatChange(entry.pnlPercent);
	const pnl = Number(entry.pnl);

	return (
		<Surface
			className={cn(
				"relative flex h-full flex-col rounded-xl shadow-sm transition-colors",
				current && "ring-1 ring-primary/40",
				featured && "bg-l2/20",
			)}
		>
			<div className="flex flex-1 flex-col p-4 sm:p-5">
				<div className="flex items-center justify-between gap-3">
					<span className="inline-flex items-center gap-2 text-xs font-medium text-medium-emphasis">
						<Trophy
							className={cn("size-4", entry.rank === 1 ? "text-primary" : "text-low-emphasis")}
							aria-hidden="true"
						/>
						Rank #{entry.rank}
					</span>
					{current ? <span className="text-xs font-medium text-primary">You</span> : null}
				</div>

				<div className="mt-4 flex items-center gap-3">
					<TraderAvatar
						entry={entry}
						className={cn("border", featured ? "size-12 sm:size-14" : "size-10")}
						fallbackClassName={featured ? "text-base" : "text-xs"}
					/>
					<div className="min-w-0">
						<p className="truncate font-semibold text-high-emphasis">{entry.name}</p>
						<p className="mt-0.5 text-xs text-medium-emphasis">{PERIOD[range]} return</p>
					</div>
				</div>

				<p
					className={cn(
						"mt-4 font-semibold tracking-tight tabular-nums",
						featured ? "text-3xl sm:text-4xl" : "text-2xl",
						valueTone(entry.pnlPercent),
					)}
				>
					{change.text}
				</p>

				<div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-3 text-xs">
					<PodiumMetric
						label={`${PERIOD[range].replace(" return", "")} PnL`}
						value={`${pnl > 0 ? "+" : ""}${formatPrice(entry.pnl)} ${quoteAsset}`}
						tone={valueTone(entry.pnl)}
					/>
					<PodiumMetric
						label="Portfolio"
						value={`${formatPrice(entry.equity)} ${quoteAsset}`}
					/>
				</div>
			</div>

			<div className="border-t border-border/40 px-4 pb-4 pt-3 sm:px-5">
				{featured ? (
					<LeaderboardHistoryChart
						history={entry.history}
						quoteAsset={quoteAsset}
						heightClassName="h-36"
					/>
				) : (
					<LeaderboardSparkline history={entry.history} className="h-9" />
				)}
			</div>
		</Surface>
	);
}

function PodiumMetric({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: string;
}) {
	return (
		<div className="min-w-0">
			<p className="text-[11px] text-low-emphasis">{label}</p>
			<p className={cn("mt-0.5 truncate font-medium tabular-nums text-high-emphasis", tone)}>
				{value}
			</p>
		</div>
	);
}

function RankingsPanel({
	entries,
	range,
	quoteAsset,
	currentUserId,
	total,
	asOf,
	fetching,
	page,
	totalPages,
	firstVisible,
	lastVisible,
	onPageChange,
}: {
	entries: LeaderboardEntry[];
	range: LeaderboardRange;
	quoteAsset: string;
	currentUserId?: string;
	total: number;
	asOf: string;
	fetching: boolean;
	page: number;
	totalPages: number;
	firstVisible: number;
	lastVisible: number;
	onPageChange: (page: number) => void;
}) {
	return (
		<section aria-labelledby="rankings-heading">
			<Surface className="rounded-xl shadow-sm">
				<div className="flex flex-col gap-2 border-b border-border/40 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
					<div>
						<h2 id="rankings-heading" className="font-semibold text-high-emphasis">
							Rankings
						</h2>
						<p className="mt-1 text-xs text-medium-emphasis">
							{PERIOD[range]} return · {total} {total === 1 ? "trader" : "traders"} ranked
						</p>
					</div>
					<LiveStatus asOf={asOf} syncing={fetching} />
				</div>

				<div className="hidden grid-cols-[3rem_minmax(0,1fr)_8rem_6.5rem_8rem_9rem] items-center gap-3 border-b border-border/40 bg-l2/50 px-4 py-2.5 text-xs text-medium-emphasis sm:grid sm:px-5">
					<span>Rank</span>
					<span>Trader</span>
					<span>Trend</span>
					<span className="text-right">Return</span>
					<span className="text-right">PnL ({quoteAsset})</span>
					<span className="text-right">Portfolio ({quoteAsset})</span>
				</div>

				{entries.length > 0 ? (
					<ol>
						{entries.map((entry) => (
							<RankingRow
								key={entry.userId}
								entry={entry}
								current={entry.userId === currentUserId}
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

function RankingRow({ entry, current }: { entry: LeaderboardEntry; current: boolean }) {
	const change = formatChange(entry.pnlPercent);
	const pnl = Number(entry.pnl);

	return (
		<li
			className={cn(
				"grid grid-cols-[2rem_minmax(0,1fr)_5rem_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-l2/40 sm:grid-cols-[3rem_minmax(0,1fr)_8rem_6.5rem_8rem_9rem] sm:px-5",
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
					<p className="mt-0.5 truncate text-xs text-medium-emphasis tabular-nums sm:hidden">
						{pnl > 0 ? "+" : ""}
						{formatPrice(entry.pnl)} · {formatPrice(entry.equity)}
					</p>
				</div>
			</div>
			<div className="h-9 min-w-0">
				<LeaderboardSparkline history={entry.history} className="h-9" />
			</div>
			<p className={cn("text-right font-semibold tabular-nums", valueTone(entry.pnlPercent))}>
				{change.text}
			</p>
			<div className="hidden text-right sm:block">
				<p className={cn("text-sm font-medium tabular-nums", valueTone(entry.pnl))}>
					{pnl > 0 ? "+" : ""}
					{formatPrice(entry.pnl)}
				</p>
				<p className={cn("mt-0.5 text-[11px] tabular-nums", valueTone(entry.totalPnlPercent))}>
					{formatChange(entry.totalPnlPercent).text} all-time
				</p>
			</div>
			<div className="hidden text-right sm:block">
				<p className="text-sm font-medium text-high-emphasis tabular-nums">
					{formatPrice(entry.equity)}
				</p>
				<p className="mt-0.5 text-[11px] text-low-emphasis tabular-nums">
					{formatPrice(entry.netContributions)} in
				</p>
			</div>
		</li>
	);
}

function PersonalStanding({
	mine,
	loading,
	range,
	quoteAsset,
}: {
	mine: MyLeaderboardResponse | null;
	loading: boolean;
	range: LeaderboardRange;
	quoteAsset: string;
}) {
	if (loading && !mine) {
		return (
			<Surface className="rounded-xl p-4 shadow-sm sm:p-5">
				<Skeleton className="h-16 w-full" />
			</Surface>
		);
	}

	if (!mine) return null;

	if (!mine.eligible) {
		return <EligibilityMessage reason={mine.reason} />;
	}

	const entry = mine.entry;
	const change = formatChange(entry.pnlPercent);
	const pnl = Number(entry.pnl);

	return (
		<Surface className="overflow-hidden rounded-xl border-primary/30 shadow-sm">
			<div className="grid gap-0 lg:grid-cols-[minmax(13rem,1.3fr)_repeat(3,minmax(7rem,1fr))_minmax(12rem,1.4fr)]">
				<div className="flex items-center gap-3 border-b border-border/40 bg-l2/40 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5">
					<TraderAvatar entry={entry} className="size-11 border" fallbackClassName="text-sm" />
					<div className="min-w-0">
						<p className="text-xs text-medium-emphasis">Your standing</p>
						<p className="mt-0.5 truncate font-semibold text-high-emphasis">{entry.name}</p>
						<p className="mt-0.5 text-[11px] text-low-emphasis">{PERIOD[range]} return</p>
					</div>
				</div>

				<StandingMetric
					className="border-b border-border/40 lg:border-b-0 lg:border-r"
					label="Rank"
					value={`#${entry.rank}`}
				/>
				<StandingMetric
					className="border-b border-border/40 lg:border-b-0 lg:border-r"
					label="Return"
					value={change.text}
					valueClassName={valueTone(entry.pnlPercent)}
				/>
				<StandingMetric
					className="border-b border-border/40 lg:border-b-0 lg:border-r"
					label={`PnL (${quoteAsset})`}
					value={`${pnl > 0 ? "+" : ""}${formatPrice(entry.pnl)}`}
					valueClassName={valueTone(entry.pnl)}
				/>
				<div className="px-4 py-3 lg:px-5">
					<LeaderboardSparkline history={entry.history} className="h-10" />
					<p className="mt-1 text-[11px] text-low-emphasis tabular-nums">
						{formatPrice(entry.equity)} {quoteAsset} portfolio
					</p>
				</div>
			</div>
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
		<div className={cn("flex min-w-0 flex-col justify-center px-4 py-3 lg:px-5", className)}>
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
				{content?.text ?? "Your return will appear once your portfolio has a usable baseline."}
			</p>
			{content ? (
				<Button asChild variant="secondary" size="sm">
					<Link to={content.to}>{content.action}</Link>
				</Button>
			) : null}
		</Surface>
	);
}

function UnavailableState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
	return (
		<FeedbackState
			className="min-h-80"
			icon={Trophy}
			title="Leaderboard unavailable"
			description={error?.message ?? "Live standings are starting up."}
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
			title="No ranked traders in this window"
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
			<div className="grid items-stretch gap-3 lg:grid-cols-[1.35fr_1fr_1fr]">
				{Array.from({ length: 3 }).map((_, index) => (
					<Surface key={index} className="rounded-xl p-5 shadow-sm">
						<Skeleton className="h-4 w-20" />
						<div className="mt-5 flex items-center gap-3">
							<Skeleton className="size-11 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
						<Skeleton className="mt-5 h-9 w-28" />
						<Skeleton className="mt-5 h-10 w-full" />
					</Surface>
				))}
			</div>

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
