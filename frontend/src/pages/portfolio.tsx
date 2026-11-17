import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpRight, ChevronRight, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { AssetIcon, assetNames } from "@/components/icons/asset-icon";
import { PortfolioEquityChart } from "@/components/portfolio/equity-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMarkets } from "@/context/MarketContext";
import {
	usePortfolio,
	usePortfolioAnalytics,
	usePortfolioHistory,
} from "@/hooks/use-portfolio";
import { getAssetColor } from "@/lib/asset-colors";
import { cn } from "@/lib/utils";
import type {
	Portfolio,
	PortfolioHistoryRange,
	PortfolioPerformanceEntry,
	PortfolioPosition,
} from "@/types";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";

const RANGES: { value: PortfolioHistoryRange; label: string }[] = [
	{ value: "24h", label: "24H" },
	{ value: "7d", label: "7D" },
	{ value: "30d", label: "30D" },
	{ value: "90d", label: "90D" },
	{ value: "all", label: "All" },
];

type AllocationSlice = {
	key: string;
	label: string;
	value: number;
	percent: number;
	color: string;
};

function colorFor(asset: string) {
	return getAssetColor(asset) ?? "#71717A";
}

function num(value: string | null | undefined) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function signedMoney(value: string | null | undefined, precision = 2) {
	const parsed = num(value);
	if (parsed == null) return "—";
	return `${parsed > 0 ? "+" : ""}${formatPrice(value, precision)}`;
}

function signedPercent(value: string | null | undefined) {
	const parsed = num(value);
	if (parsed == null) return "—";
	return `${parsed > 0 ? "+" : ""}${parsed.toFixed(2)}%`;
}

function toneFor(value: string | number | null | undefined) {
	const parsed = num(typeof value === "number" ? String(value) : value);
	if (parsed == null || parsed === 0) return "text-medium-emphasis";
	return parsed > 0 ? "text-green-text" : "text-red-text";
}

function sourceLabel(portfolio: Portfolio) {
	if (portfolio.source === "live") return "Live";
	if (portfolio.source === "projection") return "Projected";
	return "Fallback";
}

function allocationBackground(slices: AllocationSlice[]) {
	let cursor = 0;
	const stops = slices
		.filter((slice) => slice.percent > 0)
		.map((slice) => {
			const start = cursor;
			cursor = Math.min(100, cursor + slice.percent);
			return `${slice.color} ${start}% ${cursor}%`;
		});

	return stops.length ? `conic-gradient(${stops.join(", ")})` : "var(--l2)";
}

function HeroMetric({
	label,
	value,
	hint,
	className,
}: {
	label: string;
	value: string;
	hint?: string;
	className?: string;
}) {
	return (
		<div>
			<p className="text-xs text-medium-emphasis">{label}</p>
			<p className={cn("mt-1.5 text-sm font-semibold tabular-nums text-high-emphasis", className)}>
				{value}
			</p>
			{hint ? <p className="mt-0.5 text-[11px] text-low-emphasis">{hint}</p> : null}
		</div>
	);
}

function TradeCell({
	price,
	at,
	precision,
}: {
	price: string | null;
	at: string | null;
	precision: number;
}) {
	if (!price && !at) return <span className="text-xs text-low-emphasis">—</span>;

	return (
		<>
			<p className="text-sm text-high-emphasis tabular-nums">
				{price ? formatPrice(price, precision) : "—"}
			</p>
			<p className="mt-0.5 text-[11px] text-medium-emphasis">
				{at ? formatDateTime(at) : "—"}
			</p>
		</>
	);
}

function positionTotalPnl(position: PortfolioPosition) {
	const realized = num(position.realizedPnl);
	const unrealized = num(position.unrealizedPnl);
	if (realized == null && unrealized == null) return null;
	return (realized ?? 0) + (unrealized ?? 0);
}

function PnlCell({
	value,
	percent,
	hint,
}: {
	value: number | null;
	percent: string | null;
	hint?: string;
}) {
	if (value == null) return <span className="text-xs text-low-emphasis">—</span>;

	return (
		<>
			<p className={cn("text-sm font-medium tabular-nums", toneFor(value))}>
				{signedMoney(String(value))}
			</p>
			<p className={cn("mt-0.5 text-[11px] tabular-nums", toneFor(value))}>
				{percent == null ? hint : signedPercent(percent)}
			</p>
		</>
	);
}

function PortfolioLoading() {
	return (
		<>
			<section className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm">
				<div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,.8fr)]">
					<div className="p-5 sm:p-6">
						<Skeleton className="h-3 w-28" />
						<Skeleton className="mt-4 h-10 w-60 max-w-full" />
						<Skeleton className="mt-3 h-4 w-44" />
						<div className="mt-8 grid grid-cols-2 gap-5 border-t border-border/40 pt-5 sm:grid-cols-4">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="space-y-2">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-5 w-28 max-w-full" />
								</div>
							))}
						</div>
					</div>
					<div className="flex items-center gap-5 border-t border-border/40 bg-l2/20 p-5 sm:p-6 xl:border-t-0 xl:border-l">
						<Skeleton className="size-32 shrink-0 rounded-full" />
						<div className="w-full space-y-3">
							{Array.from({ length: 4 }).map((_, index) => (
								<Skeleton key={index} className="h-3 w-full" />
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="rounded-xl border border-border/60 bg-l1 p-5 shadow-sm sm:p-6">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="mt-3 h-64 w-full rounded-lg" />
			</section>

			<section className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm">
				<div className="border-b border-border/40 px-4 py-4 sm:px-5">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="mt-2 h-3 w-52" />
				</div>
				<div className="divide-y divide-border/30">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className="flex items-center gap-4 px-4 py-5 sm:px-5">
							<Skeleton className="size-10 shrink-0 rounded-full" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="ml-auto h-4 w-32" />
						</div>
					))}
				</div>
			</section>
		</>
	);
}

function AnalyticsCard({
	label,
	value,
	hint,
	tone,
	loading,
}: {
	label: string;
	value: string;
	hint: string;
	tone?: string;
	loading?: boolean;
}) {
	return (
		<div className="rounded-xl border border-border/60 bg-l1 px-4 py-4 shadow-sm sm:px-5">
			<p className="text-xs text-medium-emphasis">{label}</p>
			{loading ? (
				<>
					<Skeleton className="mt-2 h-5 w-24" />
					<Skeleton className="mt-2 h-3 w-32" />
				</>
			) : (
				<>
					<p
						className={cn(
							"mt-1.5 text-lg font-semibold tracking-tight tabular-nums text-high-emphasis",
							tone,
						)}
					>
						{value}
					</p>
					<p className="mt-0.5 text-[11px] text-medium-emphasis">{hint}</p>
				</>
			)}
		</div>
	);
}

function performerLabel(entry: PortfolioPerformanceEntry | null, loading: boolean) {
	if (loading) return " ";

	return entry?.asset ?? "—";
}

function performerHint(entry: PortfolioPerformanceEntry | null) {
	if (!entry) return "No trades yet";
	const trades = entry.tradeCount ?? 0;
	return `${signedMoney(entry.totalPnl)} · ${trades} ${trades === 1 ? "trade" : "trades"}`;
}

export function PortfolioPage() {
	const { markets } = useMarkets();
	const { portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolio();
	const { analytics, loading: analyticsLoading, error: analyticsError } =
		usePortfolioAnalytics();
	const [range, setRange] = useState<PortfolioHistoryRange>("30d");
	const {
		history,
		loading: historyLoading,
		error: historyError,
		fetching: historyFetching,
	} = usePortfolioHistory(range);

	const precision = useMemo(() => {
		const qty = new Map<string, number>();
		const price = new Map<string, number>();

		for (const market of markets) {
			qty.set(market.baseAsset, market.qtyPrecision);
			price.set(market.baseAsset, market.pricePrecision);
			price.set(market.quoteAsset, market.pricePrecision);
		}

		return {
			qty: (asset: string) => qty.get(asset) ?? 4,
			price: (asset: string) => price.get(asset) ?? 2,
		};
	}, [markets]);

	const quoteAsset = portfolio?.quoteAsset ?? "USD";
	const quotePrecision = precision.price(quoteAsset);
	const loading = portfolioLoading;

	const positions = useMemo(
		() =>
			[...(portfolio?.positions ?? [])].sort(
				(left, right) => Number(right.value) - Number(left.value),
			),
		[portfolio],
	);

	const analyticsSlice = useMemo(() => {
		return {
			loading: analyticsLoading,
			error: analyticsError,
			change24h: analytics?.change24h ?? null,
			winRate: analytics?.trading.winRate ?? null,
			sells: analytics?.trading.sells ?? 0,
			winningSells: analytics?.trading.winningSells ?? 0,
			best: analytics?.bestAsset ?? null,
			worst:
				analytics?.bestAsset && analytics?.worstAsset
					? analytics.worstAsset.asset === analytics.bestAsset.asset &&
						analytics.performance.length === 1
						? null
						: analytics.worstAsset
					: (analytics?.worstAsset ?? null),
			performanceCount: analytics?.performance.length ?? 0,
		};
	}, [analytics, analyticsError, analyticsLoading]);

	const equity = num(portfolio?.equity) ?? 0;
	const cash = num(portfolio?.cash) ?? 0;
	const cashPercent = equity > 0 ? (cash / equity) * 100 : 0;

	const slices = useMemo<AllocationSlice[]>(() => {
		const entries = positions
			.map((position) => {
				const value = num(position.value) ?? 0;
				return {
					key: position.asset,
					label: position.asset,
					value,
					percent: equity > 0 ? (value / equity) * 100 : 0,
					color: colorFor(position.asset),
				};
			})
			.filter((slice) => slice.value > 0);

		const all = [
			{
				key: quoteAsset,
				label: `${quoteAsset} cash`,
				value: cash,
				percent: cashPercent,
				color: colorFor(quoteAsset),
			},
			...entries,
		];

		return all.filter((slice) => slice.value > 0);
	}, [cash, cashPercent, equity, positions, quoteAsset]);

	const allocationStyle = {
		background: allocationBackground(slices),
	} satisfies CSSProperties;

	const pnl = num(portfolio?.pnl);
	const pnlPercent = portfolio?.pnlPercent ?? null;

	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">Portfolio</h1>
						<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
							Live equity, weighted-average cost basis and realised performance.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button asChild variant="outline" size="sm">
							<Link to="/balance-history">Balance history</Link>
						</Button>
						<Button asChild variant="outline" size="sm">
							<Link to="/activity">Activity</Link>
						</Button>
						<Button asChild size="sm">
							<Link to="/markets">Trade</Link>
						</Button>
					</div>
				</header>

				{portfolioError ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						Portfolio valuation is temporarily unavailable. The last live snapshot may still be
						shown.
					</InlineNotice>
				) : null}

				{loading ? (
					<PortfolioLoading />
				) : (
					<>
						<section
							className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
							aria-labelledby="portfolio-value-title"
						>
							{portfolio?.partial ? (
								<InlineNotice>
									Some market prices are unavailable, so the displayed value may be incomplete.
								</InlineNotice>
							) : null}
							<div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,.8fr)]">
								<div className="p-5 sm:p-6">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<p id="portfolio-value-title" className="text-sm text-medium-emphasis">
											Total equity
										</p>
										{portfolio ? (
											<div className="flex items-center gap-2">
												<Badge
													variant={portfolio.source === "live" ? "success" : "outline"}
													className="gap-1.5"
												>
													<span
														className={cn(
															"size-1.5 rounded-full",
															portfolio.source === "live"
																? "bg-green-text"
																: "bg-low-emphasis",
														)}
													/>
													{sourceLabel(portfolio)}
												</Badge>
												<p className="text-xs text-low-emphasis">
													{formatDateTime(portfolio.asOf)}
												</p>
											</div>
										) : null}
									</div>

									<p className="mt-3 text-3xl font-semibold tracking-tight text-high-emphasis tabular-nums sm:text-4xl">
										{portfolio
											? `${formatPrice(portfolio.equity, quotePrecision)} ${portfolio.quoteAsset}`
											: "Unavailable"}
									</p>

									{portfolio ? (
										<div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
											<p className={cn("text-sm font-semibold tabular-nums", toneFor(pnl))}>
												{signedMoney(portfolio.pnl, quotePrecision)} {portfolio.quoteAsset}
											</p>
											<p className={cn("text-sm tabular-nums", toneFor(pnl))}>
												{signedPercent(pnlPercent)}
											</p>
											<p className="text-xs text-medium-emphasis">
												{portfolio.netContributions == null
													? "Net contributions unavailable"
													: `on ${formatPrice(portfolio.netContributions, quotePrecision)} contributed`}
											</p>
										</div>
									) : null}

									<div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-border/40 pt-5 sm:grid-cols-4">
										<HeroMetric
											label="Cash"
											value={
												portfolio ? `${formatPrice(portfolio.cash, quotePrecision)} ${quoteAsset}` : "—"
											}
										/>
										<HeroMetric
											label="Market value"
											value={
												portfolio
													? `${formatPrice(portfolio.positionsValue, quotePrecision)} ${quoteAsset}`
													: "—"
											}
											hint={
												portfolio?.costBasis
													? `${formatPrice(portfolio.costBasis, quotePrecision)} cost basis`
													: undefined
											}
										/>
										<HeroMetric
											label="Unrealised PnL"
											value={`${signedMoney(portfolio?.unrealizedPnl, quotePrecision)} ${quoteAsset}`}
											className={toneFor(portfolio?.unrealizedPnl)}
											hint="Open positions"
										/>
										<HeroMetric
											label="Realised PnL"
											value={`${signedMoney(portfolio?.realizedPnl, quotePrecision)} ${quoteAsset}`}
											className={toneFor(portfolio?.realizedPnl)}
											hint="Closed quantity"
										/>
									</div>
								</div>

								<div className="border-t border-border/40 bg-l2/20 p-5 sm:p-6 xl:border-t-0 xl:border-l">
									<div>
										<h2 className="text-sm font-semibold text-high-emphasis">Allocation</h2>
										<p className="mt-1 text-xs text-medium-emphasis">
											Current value by asset, including cash.
										</p>
									</div>

									{slices.length ? (
										<div className="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
											<div
												className="relative size-36 shrink-0 rounded-full"
												style={allocationStyle}
												role="img"
												aria-label="Portfolio allocation by asset"
											>
												<div className="absolute inset-5 flex items-center justify-center rounded-full border border-border/50 bg-l1 text-center shadow-sm">
													<div>
														<p className="text-xl font-semibold text-high-emphasis tabular-nums">
															{positions.filter((position) => (num(position.value) ?? 0) > 0).length}
														</p>
														<p className="text-[11px] text-medium-emphasis">
															{positions.length === 1 ? "position" : "positions"}
														</p>
													</div>
												</div>
											</div>

											<div className="w-full min-w-0 space-y-3">
												{slices.slice(0, 5).map((slice) => (
													<div key={slice.key} className="flex items-center gap-3">
														<span
															className="size-2 shrink-0 rounded-full"
															style={{ backgroundColor: slice.color }}
														/>
														<span className="min-w-0 flex-1 truncate text-xs font-medium text-high-emphasis">
															{slice.label}
														</span>
														<span className="text-xs text-medium-emphasis tabular-nums">
															{slice.percent.toFixed(1)}%
														</span>
													</div>
												))}
												{slices.length > 5 ? (
													<p className="pl-5 text-[11px] text-low-emphasis">
														+{slices.length - 5} more
													</p>
												) : null}
											</div>
										</div>
									) : (
										<p className="mt-8 text-sm text-medium-emphasis">
											Allocation appears after your account holds funded assets.
										</p>
									)}
								</div>
							</div>
						</section>

						<section
							className="rounded-xl border border-border/60 bg-l1 p-4 shadow-sm sm:p-6"
							aria-labelledby="equity-history-title"
						>
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<h2 id="equity-history-title" className="text-sm font-semibold text-high-emphasis">
										Equity curve
									</h2>
									<p className="mt-1 text-xs text-medium-emphasis">
										Total account value against your net contributions.
										{historyFetching ? " Updating…" : ""}
									</p>
								</div>
								<div className="flex items-center rounded-lg border border-border/60 bg-l2/50 p-0.5">
									{RANGES.map((item) => (
										<button
											key={item.value}
											type="button"
											aria-pressed={range === item.value}
											onClick={() => setRange(item.value)}
											className={cn(
												"h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors",
												range === item.value
													? "bg-l1 text-high-emphasis shadow-sm"
													: "text-medium-emphasis hover:text-high-emphasis",
											)}
										>
											{item.label}
										</button>
									))}
								</div>
							</div>
							<div className="mt-4">
								<PortfolioEquityChart
									history={history}
									loading={historyLoading}
									error={historyError}
								/>
							</div>
						</section>

						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<AnalyticsCard
								label="24 hour performance"
								value={
									analyticsSlice.change24h
										? `${signedMoney(analyticsSlice.change24h.change, quotePrecision)} ${quoteAsset}`
										: "—"
								}
								hint={
									analyticsSlice.change24h
										? `${signedPercent(analyticsSlice.change24h.changePercent)} since ${formatDateTime(analyticsSlice.change24h.from)}`
										: analyticsSlice.loading
											? " "
											: "Not enough history yet"
								}
								tone={toneFor(analyticsSlice.change24h?.change)}
								loading={analyticsSlice.loading}
							/>
							<AnalyticsCard
								label="Win rate"
								value={
									analyticsSlice.winRate == null
										? "—"
										: `${Number(analyticsSlice.winRate).toFixed(2)}%`
								}
								hint={
									analyticsSlice.sells === 0
										? "No sells yet"
										: `${analyticsSlice.winningSells} of ${analyticsSlice.sells} sells profitable`
								}
								loading={analyticsSlice.loading}
							/>
							<AnalyticsCard
								label="Best performer"
								value={performerLabel(analyticsSlice.best, analyticsSlice.loading)}
								hint={performerHint(analyticsSlice.best)}
								tone={toneFor(analyticsSlice.best?.totalPnl)}
								loading={analyticsSlice.loading}
							/>
							<AnalyticsCard
								label="Weakest performer"
								value={performerLabel(analyticsSlice.worst, analyticsSlice.loading)}
								hint={
									analyticsSlice.worst
										? performerHint(analyticsSlice.worst)
										: analyticsSlice.best
											? "Only one traded asset"
											: "No trades yet"
								}
								tone={toneFor(analyticsSlice.worst?.totalPnl)}
								loading={analyticsSlice.loading}
							/>
						</div>

						{analyticsError ? (
							<InlineNotice tone="error">
								Performance analytics could not be loaded. Holdings are still live.
							</InlineNotice>
						) : null}

						<section
							className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
							aria-labelledby="holdings-title"
						>
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-5">
								<div>
									<h2 id="holdings-title" className="text-sm font-semibold text-high-emphasis">
										Holdings & cost basis
									</h2>
									<p className="mt-1 text-xs text-medium-emphasis">
										Weighted-average buy price, realised and unrealised PnL per asset.
									</p>
								</div>
								<p className="text-xs text-medium-emphasis">
									{positions.length} {positions.length === 1 ? "asset" : "assets"} + cash
								</p>
							</div>

							{positions.length === 0 && cash <= 0 ? (
								<div className="flex min-h-52 items-center justify-center px-6 py-10 text-center">
									<div className="max-w-sm">
										<Wallet className="mx-auto size-7 text-low-emphasis" />
										<p className="mt-3 text-sm font-semibold text-high-emphasis">
											No holdings yet
										</p>
										<p className="mt-1.5 text-sm leading-6 text-medium-emphasis">
											Your cash and traded assets will appear here after the first trade.
										</p>
										<Button asChild size="sm" className="mt-4">
											<Link to="/markets">Browse markets</Link>
										</Button>
									</div>
								</div>
							) : (
								<>
									<div className="hidden overflow-x-auto lg:block">
										<Table className="min-w-[64rem]">
											<TableHeader>
												<TableRow className="hover:bg-transparent">
													<TableHead className="pl-5">Asset</TableHead>
													<TableHead className="text-right">Position</TableHead>
													<TableHead className="text-right">Avg. cost</TableHead>
													<TableHead className="text-right">Value</TableHead>
													<TableHead className="text-right">Total PnL</TableHead>
													<TableHead className="text-right">Last buy</TableHead>
													<TableHead className="text-right">Last sell</TableHead>
													<TableHead className="w-16 pr-5" />
												</TableRow>
											</TableHeader>
											<TableBody>
												<TableRow>
													<TableCell className="pl-5">
														<div className="flex items-center gap-3">
															<AssetIcon asset={quoteAsset} className="size-9" />
															<div>
																<p className="font-semibold text-high-emphasis">{quoteAsset}</p>
																<p className="mt-0.5 text-[11px] text-medium-emphasis">Cash</p>
															</div>
														</div>
													</TableCell>
													<TableCell className="text-right text-sm text-high-emphasis">
														{formatPrice(portfolio?.cash, quotePrecision)}
													</TableCell>
													<TableCell className="text-right text-xs text-low-emphasis">—</TableCell>
													<TableCell className="text-right">
														<p className="text-sm text-high-emphasis tabular-nums">
															{formatPrice(portfolio?.cash, quotePrecision)}
														</p>
														<p className="mt-0.5 text-[11px] text-medium-emphasis tabular-nums">
															{cashPercent.toFixed(1)}%
														</p>
													</TableCell>
													<TableCell className="text-right text-xs text-low-emphasis">—</TableCell>
													<TableCell className="text-right text-xs text-low-emphasis">—</TableCell>
													<TableCell className="text-right text-xs text-low-emphasis">—</TableCell>
													<TableCell className="pr-5" />
												</TableRow>

												{positions.map((position) => {
													const qtyPrecision = precision.qty(position.asset);
													const pricePrecision = precision.price(position.asset);
													const totalPnl = positionTotalPnl(position);
													const allocation =
														num(position.allocationPercent) ??
														(equity > 0 ? ((num(position.value) ?? 0) / equity) * 100 : null);

													return (
														<TableRow key={position.asset}>
															<TableCell className="pl-5">
																<Link
																	to={`/portfolio/${position.asset}`}
																	className="flex items-center gap-3 outline-none"
																>
																	<AssetIcon asset={position.asset} className="size-9" />
																	<div>
																		<p className="font-semibold text-high-emphasis">
																			{position.asset}
																		</p>
																		<p className="mt-0.5 text-[11px] text-medium-emphasis">
																			{assetNames[position.asset] ?? position.symbol ?? "Asset"}
																		</p>
																	</div>
																</Link>
															</TableCell>
															<TableCell className="text-right">
																<p className="text-sm text-high-emphasis tabular-nums">
																	{formatPrice(position.total, qtyPrecision)}
																</p>
																<p className="mt-0.5 text-[11px] text-medium-emphasis">
																	{formatQty(position.available, qtyPrecision)} available
																</p>
															</TableCell>
															<TableCell className="text-right">
																<p className="text-sm text-high-emphasis tabular-nums">
																	{position.averageCost
																		? formatPrice(position.averageCost, pricePrecision)
																		: "—"}
																</p>
																<p className="mt-0.5 text-[11px] text-medium-emphasis">
																	{position.costBasis
																		? `${formatPrice(position.costBasis, quotePrecision)} basis`
																		: "No basis"}
																</p>
															</TableCell>
															<TableCell className="text-right">
																<p className="text-sm text-high-emphasis tabular-nums">
																	{formatPrice(position.value, quotePrecision)}
																</p>
																<p className="mt-0.5 text-[11px] text-medium-emphasis tabular-nums">
																	{allocation == null ? "—" : `${allocation.toFixed(1)}%`}
																</p>
															</TableCell>
															<TableCell className="text-right">
																<PnlCell
																	value={totalPnl}
																	percent={position.unrealizedPnlPercent}
																	hint={position.qty === "0" || Number(position.qty) === 0 ? "Closed" : undefined}
																/>
															</TableCell>
															<TableCell className="text-right">
																<TradeCell
																	price={position.lastBuyPrice}
																	at={position.lastBuyAt}
																	precision={pricePrecision}
																/>
															</TableCell>
															<TableCell className="text-right">
																<TradeCell
																	price={position.lastSellPrice}
																	at={position.lastSellAt}
																	precision={pricePrecision}
																/>
															</TableCell>
															<TableCell className="pr-5 text-right">
																<Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${position.asset} details`}>
																	<Link to={`/portfolio/${position.asset}`}>
																		<ChevronRight className="size-4" />
																	</Link>
																</Button>
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>

									<div className="divide-y divide-border/30 lg:hidden">
										<Link
											to="/balance-history"
											className="flex items-center justify-between gap-4 px-4 py-4 focus-visible:bg-l2 focus-visible:outline-none"
										>
											<div className="flex items-center gap-3">
												<AssetIcon asset={quoteAsset} className="size-9" />
												<div>
													<p className="text-sm font-semibold text-high-emphasis">{quoteAsset}</p>
													<p className="text-xs text-medium-emphasis">Cash</p>
												</div>
											</div>
											<div className="text-right">
												<p className="text-sm font-semibold text-high-emphasis tabular-nums">
													{formatPrice(portfolio?.cash, quotePrecision)}
												</p>
												<p className="mt-0.5 text-[11px] text-medium-emphasis tabular-nums">
													{cashPercent.toFixed(1)}%
												</p>
											</div>
										</Link>

										{positions.map((position) => {
											const qtyPrecision = precision.qty(position.asset);
											const pricePrecision = precision.price(position.asset);
											const totalPnl = positionTotalPnl(position);
											const allocation =
												num(position.allocationPercent) ??
												(equity > 0 ? ((num(position.value) ?? 0) / equity) * 100 : null);

											return (
												<Link
													key={position.asset}
													to={`/portfolio/${position.asset}`}
													className="block px-4 py-4 focus-visible:bg-l2 focus-visible:outline-none"
												>
													<div className="flex items-start justify-between gap-4">
														<div className="flex min-w-0 items-center gap-3">
															<AssetIcon asset={position.asset} className="size-9 shrink-0" />
															<div className="min-w-0">
																<p className="font-semibold text-high-emphasis">{position.asset}</p>
																<p className="truncate text-xs text-medium-emphasis">
																	{assetNames[position.asset] ?? position.symbol ?? "Asset"}
																</p>
															</div>
														</div>
														<div className="shrink-0 text-right">
															<p className="text-sm font-semibold text-high-emphasis tabular-nums">
																{formatPrice(position.value, quotePrecision)}
															</p>
															<p className="mt-0.5 text-[11px] text-medium-emphasis tabular-nums">
																{allocation == null ? "—" : `${allocation.toFixed(1)}%`}
															</p>
														</div>
													</div>

													<div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/30 pt-3 text-xs">
														<div>
															<p className="text-medium-emphasis">Position</p>
															<p className="mt-1 font-medium text-high-emphasis tabular-nums">
																{formatPrice(position.total, qtyPrecision)} {position.asset}
															</p>
														</div>
														<div className="text-right">
															<p className="text-medium-emphasis">Avg. cost</p>
															<p className="mt-1 font-medium text-high-emphasis tabular-nums">
																{position.averageCost
																	? formatPrice(position.averageCost, pricePrecision)
																	: "—"}
															</p>
														</div>
														<div>
															<p className="text-medium-emphasis">Total PnL</p>
															<p
																className={cn(
																	"mt-1 font-medium tabular-nums",
																	toneFor(totalPnl),
																)}
															>
																{totalPnl == null ? "—" : signedMoney(String(totalPnl))}
															</p>
														</div>
														<div className="text-right">
															<p className="text-medium-emphasis">Last buy / sell</p>
															<p className="mt-1 font-medium text-high-emphasis tabular-nums">
																{position.lastBuyPrice
																	? formatPrice(position.lastBuyPrice, pricePrecision)
																	: "—"}{" "}
																/{" "}
																{position.lastSellPrice
																	? formatPrice(position.lastSellPrice, pricePrecision)
																	: "—"}
															</p>
														</div>
													</div>

													<div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-medium-emphasis">
														<span>
															Buy {formatDateTime(position.lastBuyAt ?? "")} · Sell{" "}
															{formatDateTime(position.lastSellAt ?? "")}
														</span>
														<span className="inline-flex shrink-0 items-center gap-1 font-medium text-high-emphasis">
															Details <ArrowUpRight className="size-3.5" />
														</span>
													</div>
												</Link>
											);
										})}
									</div>
								</>
							)}
						</section>
					</>
				)}
			</PageContent>
		</Page>
	);
}
