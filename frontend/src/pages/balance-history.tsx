import { useMemo } from "react";
import {
	ArrowDownToLine,
	ArrowLeftRight,
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	CircleAlert,
	Gift,
	LockKeyhole,
	RefreshCw,
	Sparkles,
	Unlock,
	WalletCards,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { BalanceTrajectoryChart } from "@/components/balance-history/balance-trajectory-chart";
import { AssetIcon, assetNames } from "@/components/icons/asset-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackState, InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent } from "@/components/ui/page";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBalanceHistory, useBalanceSeries } from "@/hooks/use-balance-history";
import { cn } from "@/lib/utils";
import type {
	BalanceChangeReason,
	BalanceHistoryEntry,
	BalanceHistoryRange,
	BalanceSeriesResponse,
} from "@/types";
import { formatDateTime, formatPrice } from "@/utils/format";

const PAGE_SIZE = 20;

const RANGES: { value: BalanceHistoryRange; label: string }[] = [
	{ value: "24h", label: "24H" },
	{ value: "7d", label: "7D" },
	{ value: "30d", label: "30D" },
	{ value: "90d", label: "90D" },
	{ value: "all", label: "All" },
];

const REASONS: {
	value: BalanceChangeReason;
	label: string;
	icon: typeof Sparkles;
	className: string;
}[] = [
	{
		value: "initialized",
		label: "Opening balance",
		icon: Sparkles,
		className: "bg-primary/10 text-primary",
	},
	{
		value: "deposited",
		label: "Deposit",
		icon: ArrowDownToLine,
		className: "bg-green-bg/60 text-green-text",
	},
	{
		value: "credited",
		label: "Daily credit",
		icon: Gift,
		className: "bg-green-bg/60 text-green-text",
	},
	{
		value: "order.locked",
		label: "Order reserved",
		icon: LockKeyhole,
		className: "bg-l3 text-medium-emphasis",
	},
	{
		value: "order.released",
		label: "Order released",
		icon: Unlock,
		className: "bg-l3 text-medium-emphasis",
	},
	{
		value: "fill.settled",
		label: "Trade settled",
		icon: ArrowLeftRight,
		className: "bg-chart-5/10 text-chart-5",
	},
];

const reasonMeta = new Map(REASONS.map((reason) => [reason.value, reason]));

function precisionOf(value?: string | null) {
	const fractional = value?.split(".")[1];
	return fractional?.length ?? 2;
}

function formatAmount(value?: string | null, precision = precisionOf(value)) {
	if (value === undefined || value === null || value === "") return "-";
	return formatPrice(value, precision);
}

function formatSigned(value: string, precision: number) {
	const numeric = Number(value);
	const formatted = formatAmount(value, precision);
	return numeric > 0 ? `+${formatted}` : formatted;
}

function changeClass(value: string | number | null | undefined) {
	const numeric = Number(value ?? 0);
	if (!Number.isFinite(numeric) || numeric === 0) return "text-medium-emphasis";
	return numeric > 0 ? "text-green-text" : "text-red-text";
}

function reasonBadge(reason: BalanceChangeReason) {
	const meta = reasonMeta.get(reason);
	const Icon = meta?.icon ?? Sparkles;
	return (
		<Badge
			variant="outline"
			className={cn("gap-1 border-transparent", meta?.className ?? "bg-l3 text-medium-emphasis")}
		>
			<Icon className="size-3" />
			{meta?.label ?? reason}
		</Badge>
	);
}

function relativePrecision(series: BalanceSeriesResponse | null, asset: string | null) {
	if (series && (!asset || series.asset === asset)) return series.precision;
	return 2;
}

function SummaryCard({
	label,
	value,
	detail,
	valueClassName,
	loading,
}: {
	label: string;
	value: React.ReactNode;
	detail?: React.ReactNode;
	valueClassName?: string;
	loading?: boolean;
}) {
	return (
		<div className="rounded-xl border border-border/60 bg-l1 px-4 py-4 shadow-sm sm:px-5">
			<p className="text-xs text-medium-emphasis">{label}</p>
			{loading ? (
				<Skeleton className="mt-2 h-7 w-32" />
			) : (
				<p
					className={cn(
						"mt-1.5 truncate text-xl font-semibold tracking-tight text-high-emphasis tabular-nums",
						valueClassName,
					)}
				>
					{value}
				</p>
			)}
			{detail ? <div className="mt-1 text-xs text-medium-emphasis">{detail}</div> : null}
		</div>
	);
}

function AssetRail({
	assets,
	selected,
	unit,
	onSelect,
	loading,
}: {
	assets: ReturnType<typeof useBalanceHistory>["history"] extends infer T
		? T extends { assets: infer U }
			? U
			: never
		: never;
	selected: string;
	unit: string;
	onSelect: (asset: string) => void;
	loading: boolean;
}) {
	return (
		<section
			className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
			aria-labelledby="balance-assets-title"
		>
			<div className="flex items-center justify-between gap-4 border-b border-border/40 px-4 py-4 sm:px-5">
				<div>
					<h2 id="balance-assets-title" className="text-sm font-semibold text-high-emphasis">
						Accounts
					</h2>
					<p className="mt-1 text-xs text-medium-emphasis">
						Select an asset to isolate its ledger.
					</p>
				</div>
				<Badge variant="outline" className="border-border/60 text-medium-emphasis">
					{unit}
				</Badge>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{loading ? (
					<div className="space-y-4 p-4 sm:p-5">
						{Array.from({ length: 4 }).map((_, index) => (
							<div key={index} className="flex items-center gap-3">
								<Skeleton className="size-9 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-3.5 w-20" />
									<Skeleton className="h-3 w-28" />
								</div>
								<Skeleton className="h-4 w-16" />
							</div>
						))}
					</div>
				) : assets.length === 0 ? (
					<p className="px-4 py-8 text-center text-sm text-medium-emphasis">
						No funded accounts yet.
					</p>
				) : (
					<div className="divide-y divide-border/30">
						{assets.map((asset) => {
							const active = selected === asset.asset;
							return (
								<button
									key={asset.asset}
									type="button"
									onClick={() => onSelect(asset.asset)}
									aria-pressed={active}
									className={cn(
										"flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-l2/50 focus-visible:bg-l2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5",
										active && "bg-l2/60",
									)}
								>
									<AssetIcon asset={asset.asset} className="size-9 shrink-0" />
									<div className="min-w-0 flex-1">
										<p className="flex items-center gap-2 text-sm font-semibold text-high-emphasis">
											{asset.asset}
											{active ? (
												<span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
											) : null}
										</p>
										<p className="mt-0.5 truncate text-xs text-medium-emphasis">
											{assetNames[asset.asset] ?? asset.asset}
										</p>
									</div>
									<div className="shrink-0 text-right">
										<p className="text-sm font-semibold text-high-emphasis tabular-nums">
											{formatAmount(asset.total, precisionOf(asset.total))}
										</p>
										<p
											className={cn(
												"mt-0.5 text-xs tabular-nums",
												changeClass(asset.netChange),
											)}
										>
											{formatSigned(asset.netChange, precisionOf(asset.netChange))}
										</p>
									</div>
									<ChevronRight className="size-4 shrink-0 text-low-emphasis" />
								</button>
							);
						})}
					</div>
				)}
			</div>
		</section>
	);
}

function LedgerCard({ entry }: { entry: BalanceHistoryEntry }) {
	const precision = precisionOf(entry.total);
	const meta = reasonMeta.get(entry.reason);
	const Icon = meta?.icon ?? Sparkles;

	return (
		<article className="px-4 py-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<span
						className={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-lg",
							meta?.className ?? "bg-l3 text-medium-emphasis",
						)}
					>
						<Icon className="size-4" />
					</span>
					<div className="min-w-0">
						<p className="font-semibold text-high-emphasis">
							{meta?.label ?? entry.reason}
						</p>
						<p className="mt-0.5 text-xs text-medium-emphasis">
							{formatDateTime(entry.occurredAt)}
							{entry.symbol ? ` · ${entry.symbol.replace("_", "/")}` : ""}
						</p>
					</div>
				</div>
				<p className={cn("shrink-0 text-sm font-semibold tabular-nums", changeClass(entry.deltaTotal))}>
					{formatSigned(entry.deltaTotal, precision)} {entry.asset}
				</p>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/30 pt-3">
				<div>
					<p className="text-[11px] text-medium-emphasis">Balance after</p>
					<p className="mt-1 text-sm font-medium text-high-emphasis tabular-nums">
						{formatAmount(entry.total, precision)} {entry.asset}
					</p>
				</div>
				<div className="text-right">
					<p className="text-[11px] text-medium-emphasis">Available / reserved</p>
					<p className="mt-1 text-xs text-medium-emphasis tabular-nums">
						{formatAmount(entry.available, precision)} / {formatAmount(entry.locked, precision)}
					</p>
				</div>
			</div>
		</article>
	);
}

function LedgerRow({ entry }: { entry: BalanceHistoryEntry }) {
	const precision = precisionOf(entry.total);
	const lockedShift = Number(entry.deltaLocked) !== 0;
	const availableShift = Number(entry.deltaAvailable) !== 0;

	return (
		<TableRow className="hover:bg-l2/40">
			<TableCell className="px-3 text-xs font-normal text-medium-emphasis">
				{formatDateTime(entry.occurredAt)}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<AssetIcon asset={entry.asset} className="size-6 shrink-0" />
					<span>{entry.asset}</span>
				</div>
			</TableCell>
			<TableCell>{reasonBadge(entry.reason)}</TableCell>
			<TableCell className="text-right">
				<p className={cn("font-semibold", changeClass(entry.deltaTotal))}>
					{formatSigned(entry.deltaTotal, precision)}
				</p>
				{availableShift || lockedShift ? (
					<p className="mt-0.5 text-[11px] font-normal text-medium-emphasis">
						{availableShift ? `Avail ${formatSigned(entry.deltaAvailable, precision)}` : ""}
						{availableShift && lockedShift ? " · " : ""}
						{lockedShift ? `Locked ${formatSigned(entry.deltaLocked, precision)}` : ""}
					</p>
				) : null}
			</TableCell>
			<TableCell className="text-right">
				<p className="font-semibold">{formatAmount(entry.total, precision)}</p>
				<p className="mt-0.5 text-[11px] font-normal text-medium-emphasis">
					{formatAmount(entry.available, precision)} avail ·{" "}
					{formatAmount(entry.locked, precision)} locked
				</p>
			</TableCell>
			<TableCell className="px-3 text-right text-xs font-normal text-medium-emphasis">
				{entry.symbol ? (
					<span className="block">{entry.symbol.replace("_", "/")}</span>
				) : null}
				{entry.referenceId ? (
					<span className="mt-0.5 block max-w-28 truncate font-mono text-[10px] text-low-emphasis" title={entry.referenceId}>
						{entry.referenceId.slice(0, 8)}…
					</span>
				) : (
					<span className="text-low-emphasis">-</span>
				)}
			</TableCell>
		</TableRow>
	);
}

function LedgerSkeleton() {
	return (
		<div className="divide-y divide-border/30">
			{Array.from({ length: 6 }).map((_, index) => (
				<div key={index} className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-5 lg:grid-cols-6">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="hidden h-4 w-24 lg:block" />
					<Skeleton className="hidden h-4 w-20 lg:block" />
					<Skeleton className="hidden h-4 w-24 lg:block" />
					<Skeleton className="hidden h-4 w-16 lg:block" />
				</div>
			))}
		</div>
	);
}

export function BalanceHistoryPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const assetParam = searchParams.get("asset");
	const reasonParam = searchParams.get("reason");
	const rangeParam = searchParams.get("range");
	const pageParam = Number(searchParams.get("page"));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const range: BalanceHistoryRange = RANGES.some((item) => item.value === rangeParam)
		? (rangeParam as BalanceHistoryRange)
		: "30d";
	const reason = REASONS.some((item) => item.value === reasonParam)
		? (reasonParam as BalanceChangeReason)
		: null;

	const {
		history,
		loading: historyLoading,
		fetching: historyFetching,
		error: historyError,
		refresh: refreshHistory,
	} = useBalanceHistory({
		asset: assetParam,
		reason,
		page,
		limit: PAGE_SIZE,
	});
	const {
		series,
		loading: seriesLoading,
		error: seriesError,
		refresh: refreshSeries,
	} = useBalanceSeries({ asset: assetParam, range });

	const assets = history?.assets ?? [];
	const selectedAsset = assetParam ?? "all";
	const precision = relativePrecision(series, assetParam);
	const unit = assetParam ?? series?.unit ?? "USD";
	const currentTotal = series?.current?.total ?? null;
	const currentAvailable = series?.current?.available ?? null;
	const currentLocked = series?.current?.locked ?? null;
	const filteredNetChange = history?.filtered.netChange ?? null;
	const rangeLabel = RANGES.find((item) => item.value === range)?.label ?? "30D";
	const activeReason = reason ? reasonMeta.get(reason) : null;

	const updateView = (changes: Record<string, string | null>, resetPage = true) => {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			for (const [key, value] of Object.entries(changes)) {
				if (value === null) next.delete(key);
				else next.set(key, value);
			}
			if (resetPage) next.delete("page");
			return next;
		});
	};

	const selectedAssetLabel = useMemo(
		() => (assetParam ? `${assetNames[assetParam] ?? assetParam}` : "All assets"),
		[assetParam],
	);

	const handleRefresh = () => {
		void refreshHistory();
		void refreshSeries();
	};

	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">
							Balance history
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
							Trace every credit, reservation, release and settlement recorded against your
							account.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleRefresh}
							disabled={historyFetching}
						>
							<RefreshCw className={cn(historyFetching && "animate-spin")} />
							Refresh
						</Button>
						<Button asChild size="sm">
							<Link to="/portfolio">View portfolio</Link>
						</Button>
					</div>
				</header>

				{historyError ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						Balance history could not be loaded.{" "}
						<button
							type="button"
							onClick={() => void refreshHistory()}
							className="font-medium underline underline-offset-4"
						>
							Try again
						</button>
					</InlineNotice>
				) : null}

				<div className="grid gap-3 sm:grid-cols-3">
					<SummaryCard
						label={assetParam ? `${unit} balance` : "Total balance"}
						value={
							currentTotal
								? `${formatAmount(currentTotal, precision)} ${unit}`
								: "Unavailable"
						}
						detail={
							currentAvailable && currentLocked
								? `${formatAmount(currentAvailable, precision)} available · ${formatAmount(currentLocked, precision)} reserved`
								: undefined
						}
						loading={seriesLoading && !series}
					/>
					<SummaryCard
						label={`Change over ${rangeLabel}`}
						value={series ? `${formatSigned(series.change, precision)} ${unit}` : "Unavailable"}
						valueClassName={changeClass(series?.change)}
						detail={
							series?.partial
								? "Some assets are excluded from the total."
								: "Based on recorded balance changes."
						}
						loading={seriesLoading && !series}
					/>
					<SummaryCard
						label={assetParam ? "Filtered entries" : "Ledger entries"}
						value={(history?.filtered.entryCount ?? 0).toLocaleString()}
						detail={
							<div className="flex flex-wrap items-center gap-1.5">
								<span>{selectedAssetLabel}</span>
								{filteredNetChange ? (
									<>
										<span aria-hidden="true">·</span>
										<span className={changeClass(filteredNetChange)}>
											{formatSigned(filteredNetChange, precisionOf(filteredNetChange))} {assetParam}
										</span>
									</>
								) : null}
								{activeReason ? (
									<>
										<span aria-hidden="true">·</span>
										<span>{activeReason.label}</span>
									</>
								) : null}
							</div>
						}
						loading={historyLoading && !history}
					/>
				</div>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,.6fr)]">
					<section
						className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
						aria-labelledby="balance-trajectory-title"
					>
						<div className="flex flex-col gap-4 border-b border-border/40 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<h2
									id="balance-trajectory-title"
									className="text-sm font-semibold text-high-emphasis"
								>
									Balance trajectory
								</h2>
								<p className="mt-1 text-xs text-medium-emphasis">
									{assetParam
										? `Available and reserved ${unit} over time.`
										: "Total account value over time, valued at current market prices."}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Select
									value={selectedAsset}
									onValueChange={(value) =>
										updateView({ asset: value === "all" ? null : value })
									}
								>
									<SelectTrigger size="sm" className="h-8 min-w-32 bg-l1 text-xs">
										<SelectValue placeholder="Asset" />
									</SelectTrigger>
									<SelectContent align="end">
										<SelectItem value="all">All assets</SelectItem>
										{assets.map((asset) => (
											<SelectItem key={asset.asset} value={asset.asset}>
												<span className="flex items-center gap-2">
													<AssetIcon asset={asset.asset} className="size-4" />
													{asset.asset}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<div
									className="flex items-center rounded-lg border border-border/60 bg-l1 p-0.5"
									role="group"
									aria-label="Chart range"
								>
									{RANGES.map((item) => (
										<button
											key={item.value}
											type="button"
											aria-pressed={range === item.value}
											onClick={() => updateView({ range: item.value }, false)}
											className={cn(
												"h-7 cursor-pointer rounded-md px-2 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
												range === item.value
													? "bg-l3 text-high-emphasis"
													: "text-medium-emphasis hover:text-high-emphasis",
											)}
										>
											{item.label}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="px-4 pt-4 sm:px-5">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div className="flex items-baseline gap-2">
									<p className="text-2xl font-semibold tracking-tight text-high-emphasis tabular-nums">
										{currentTotal
											? `${formatAmount(currentTotal, precision)} ${unit}`
											: "Waiting for data"}
									</p>
									{series ? (
										<span
											className={cn(
												"text-sm font-medium tabular-nums",
												changeClass(series.change),
											)}
										>
											{formatSigned(series.change, precision)}
										</span>
									) : null}
								</div>
								<div className="flex items-center gap-4 text-[11px] text-medium-emphasis">
									<span className="flex items-center gap-1.5">
										<span className="size-2 rounded-full bg-green-text" aria-hidden="true" />
										Available
									</span>
									<span className="flex items-center gap-1.5">
										<span className="size-2 rounded-full bg-chart-5" aria-hidden="true" />
										Reserved
									</span>
								</div>
							</div>
							<p className="mt-1 text-xs text-medium-emphasis">
								{assetParam
									? `${selectedAssetLabel} ledger, ${rangeLabel} range`
									: `All assets, ${rangeLabel} range`}
							</p>
						</div>

						<div className="px-2 pb-4 sm:px-3">
							<BalanceTrajectoryChart
								series={series}
								loading={seriesLoading}
								error={seriesError}
								className="h-64 sm:h-72"
							/>
						</div>
					</section>

					<AssetRail
						assets={assets}
						selected={selectedAsset}
						unit={series?.unit ?? "USD"}
						onSelect={(asset) =>
							updateView({ asset: asset === selectedAsset ? null : asset })
						}
						loading={historyLoading && !history}
					/>
				</div>

				<section
					className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
					aria-labelledby="balance-ledger-title"
				>
					<div className="flex flex-col gap-3 border-b border-border/40 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h2 id="balance-ledger-title" className="text-sm font-semibold text-high-emphasis">
								Full ledger
							</h2>
							<p className="mt-1 text-xs text-medium-emphasis">
								Every recorded balance movement, newest first.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Select
								value={selectedAsset}
								onValueChange={(value) => updateView({ asset: value === "all" ? null : value })}
							>
								<SelectTrigger size="sm" className="h-8 min-w-32 bg-l1 text-xs">
									<SelectValue placeholder="Asset" />
								</SelectTrigger>
								<SelectContent align="end">
									<SelectItem value="all">All assets</SelectItem>
									{assets.map((asset) => (
										<SelectItem key={asset.asset} value={asset.asset}>
											<span className="flex items-center gap-2">
												<AssetIcon asset={asset.asset} className="size-4" />
												{asset.asset}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={reason ?? "all"}
								onValueChange={(value) =>
									updateView({ reason: value === "all" ? null : value })
								}
							>
								<SelectTrigger size="sm" className="h-8 min-w-36 bg-l1 text-xs">
									<SelectValue placeholder="All activity" />
								</SelectTrigger>
								<SelectContent align="end">
									<SelectItem value="all">All activity</SelectItem>
									{REASONS.map((item) => (
										<SelectItem key={item.value} value={item.value}>
											<span className="flex items-center gap-2">
												<item.icon className="size-3.5" />
												{item.label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{(assetParam || reason) && (
								<Button
									type="button"
									variant="ghost"
									size="xs"
									onClick={() => updateView({ asset: null, reason: null })}
								>
									Clear
								</Button>
							)}
						</div>
					</div>

					{historyLoading && !history ? (
						<LedgerSkeleton />
					) : historyError && !history ? (
						<FeedbackState
							icon={CircleAlert}
							title="Ledger unavailable"
							description="Balance history could not be loaded. Please try again in a moment."
							action={
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void refreshHistory()}
								>
									Try again
								</Button>
							}
						/>
					) : history && history.entries.length === 0 ? (
						<FeedbackState
							icon={WalletCards}
							title={assetParam || reason ? "No matching entries" : "No balance history yet"}
							description={
								assetParam || reason
									? "Try clearing the asset or activity filter to see the full ledger."
									: "Credits, deposits and trade settlements will appear here once your account changes."
							}
							action={
								assetParam || reason ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => updateView({ asset: null, reason: null })}
									>
										Clear filters
									</Button>
								) : (
									<Button asChild size="sm">
										<Link to="/markets">Browse markets</Link>
									</Button>
								)
							}
						/>
					) : (
						<>
							<Table className="hidden table-fixed min-w-224 lg:table">
								<colgroup>
									<col className="w-40" />
									<col className="w-28" />
									<col className="w-36" />
									<col className="w-32" />
									<col className="w-40" />
									<col className="w-36" />
								</colgroup>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="px-3">Time</TableHead>
										<TableHead>Asset</TableHead>
										<TableHead>Activity</TableHead>
										<TableHead className="text-right">Change</TableHead>
										<TableHead className="text-right">Balance after</TableHead>
										<TableHead className="px-3 text-right">Reference</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{history?.entries.map((entry) => (
										<LedgerRow key={entry.id} entry={entry} />
									))}
								</TableBody>
							</Table>

							<div className="divide-y divide-border/30 lg:hidden">
								{history?.entries.map((entry) => (
									<LedgerCard key={entry.id} entry={entry} />
								))}
							</div>

							<div className="flex items-center justify-between border-t border-border/40 px-4 py-3 sm:px-5">
								<p className="text-xs text-medium-emphasis">
									{history
										? `${(history.pagination.page - 1) * history.pagination.limit + 1}-${Math.min(
												history.pagination.page * history.pagination.limit,
												history.pagination.total,
											)} of ${history.pagination.total}`
										: "-"}
								</p>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										disabled={!history?.pagination.hasPreviousPage}
										onClick={() => updateView({ page: page - 1 <= 1 ? null : String(page - 1) }, false)}
										aria-label="Previous page"
									>
										<ChevronLeft />
									</Button>
									<span className="min-w-14 text-center text-xs text-medium-emphasis">
										{history?.pagination.page ?? 1} / {history?.pagination.totalPages ?? 1}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										disabled={!history?.pagination.hasNextPage}
										onClick={() => updateView({ page: String(page + 1) }, false)}
										aria-label="Next page"
									>
										<ChevronRight />
									</Button>
								</div>
							</div>
						</>
					)}
				</section>

				<div className="flex items-center justify-between gap-4 pb-4">
					<p className="text-xs text-medium-emphasis">
						{assetParam
							? `Showing ${selectedAssetLabel} activity.`
							: "Showing activity across all assets."}
					</p>
					<Button asChild variant="ghost" size="xs">
						<Link to="/portfolio">
							Portfolio <ArrowRight />
						</Link>
					</Button>
				</div>
			</PageContent>
		</Page>
	);
}
