import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { AssetIcon } from "@/components/icons/asset-icon";
import { MarketLineChart } from "@/components/market/market-line-chart";
import { Button } from "@/components/ui/button";
import { FeedbackState, InlineNotice } from "@/components/ui/feedback-state";
import { Input } from "@/components/ui/input";
import { Page, PageContent } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { useMarkets } from "@/context/MarketContext";
import { useTickers } from "@/hooks/use-tickers";
import { cn } from "@/lib/utils";
import type { Market, Ticker } from "@/types";
import { formatChange, formatPrice, formatVolume } from "@/utils/format";

interface MarketCardProps {
	market: Market;
	ticker?: Ticker;
	featured?: boolean;
}

function formatMoney(value?: string | number | null, precision = 2) {
	if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value)))
		return "-";
	return `$${formatPrice(value, precision)}`;
}

function formatQuoteVolume(value?: string | number) {
	const formatted = formatVolume(value);
	return formatted === "-" ? formatted : `$${formatted}`;
}

function MarketCard({ market, ticker, featured = false }: MarketCardProps) {
	const change = formatChange(ticker?.priceChangePercent);

	return (
		<Link
			to={`/trade/${market.symbol}`}
			className={cn(
				"group flex min-h-64 flex-col overflow-hidden rounded-xl border border-border/60 bg-l1 p-4 shadow-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-l2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
				featured && "min-h-80 md:min-h-100 xl:col-span-8 xl:row-span-2",
				!featured && "xl:col-span-4",
			)}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3">
					<div
						className={cn("shrink-0 overflow-hidden rounded-full", featured ? "size-11" : "size-9")}
					>
						<AssetIcon asset={market.baseAsset} />
					</div>
					<div className="min-w-0">
						<div className="flex items-baseline gap-1.5">
							<h2 className="font-medium text-high-emphasis">{market.baseAsset}</h2>
							<span className="text-xs text-low-emphasis">/{market.quoteAsset}</span>
						</div>
						<p className="truncate text-xs text-medium-emphasis">{market.name}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={cn(
							"rounded-md px-2 py-1 text-xs font-medium tabular-nums",
							change.isUp ? "bg-green-bg/50 text-green-text" : "bg-red-bg/50 text-red-text",
						)}
					>
						{change.text}
					</span>
					<ArrowUpRight
						className="size-4 text-low-emphasis transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-high-emphasis"
						aria-hidden="true"
					/>
				</div>
			</div>

			<div className={cn("mt-5", featured && "sm:mt-7")}>
				<p
					className={cn(
						"font-semibold tracking-tight text-high-emphasis tabular-nums",
						featured ? "text-3xl sm:text-4xl" : "text-2xl",
					)}
				>
					{formatMoney(ticker?.lastPrice, market.pricePrecision)}
				</p>
			</div>

			<MarketLineChart
				symbol={market.symbol}
				positive={change.isUp}
				className={cn("my-5 flex-1", featured ? "min-h-32 sm:min-h-40" : "min-h-24")}
			/>

			<div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
				<MarketStat label="24h volume" value={formatQuoteVolume(ticker?.quoteVolume)} />
				<MarketStat label="24h high" value={formatMoney(ticker?.high, market.pricePrecision)} />
				<MarketStat label="24h low" value={formatMoney(ticker?.low, market.pricePrecision)} />
			</div>
		</Link>
	);
}

function MarketStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="truncate text-[11px] text-low-emphasis">{label}</p>
			<p className="mt-1 truncate text-xs font-medium text-high-emphasis tabular-nums sm:text-sm">
				{value}
			</p>
		</div>
	);
}

function MarketCardSkeleton({ featured = false }: { featured?: boolean }) {
	return (
		<Surface
			className={cn(
				"flex min-h-64 flex-col rounded-xl p-4 shadow-sm sm:p-5",
				featured && "min-h-80 md:min-h-100 xl:col-span-8 xl:row-span-2",
				!featured && "xl:col-span-4",
			)}
		>
			<div className="flex items-center gap-3">
				<Skeleton className="size-10 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-16" />
				</div>
			</div>
			<Skeleton className="mt-6 h-8 w-40" />
			<Skeleton className="my-6 min-h-28 flex-1 rounded-lg" />
			<div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index} className="space-y-2">
						<Skeleton className="h-3 w-14" />
						<Skeleton className="h-4 w-20 max-w-full" />
					</div>
				))}
			</div>
		</Surface>
	);
}

export function MarketsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const query = searchParams.get("q") ?? "";
	const {
		markets,
		loading: marketsLoading,
		error: marketsError,
		refresh: refreshMarkets,
	} = useMarkets();
	const {
		tickers,
		loading: tickersLoading,
		error: tickerError,
		refresh: refreshTickers,
	} = useTickers();

	const sortedMarkets = useMemo(
		() =>
			[...markets].sort(
				(a, b) =>
					Number(tickers[b.symbol]?.quoteVolume ?? 0) - Number(tickers[a.symbol]?.quoteVolume ?? 0),
			),
		[markets, tickers],
	);
	const filteredMarkets = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return sortedMarkets;
		return sortedMarkets.filter((market) =>
			[market.symbol, market.name, market.baseAsset, market.quoteAsset].some((value) =>
				value.toLowerCase().includes(normalizedQuery),
			),
		);
	}, [query, sortedMarkets]);

	const initialLoading = marketsLoading || (tickersLoading && !Object.keys(tickers).length);
	const updateQuery = (value: string) => {
		setSearchParams(
			(current) => {
				const next = new URLSearchParams(current);
				const normalized = value.trimStart();
				if (normalized) next.set("q", normalized);
				else next.delete("q");
				return next;
			},
			{ replace: true },
		);
	};

	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1
							id="live-markets-heading"
							className="text-xl font-semibold tracking-tight text-high-emphasis"
						>
							Live markets
						</h1>
						<p className="mt-1 text-sm text-medium-emphasis">
							One-hour price history, updated as trades settle.
						</p>
					</div>
					<label className="relative w-full sm:w-72">
						<span className="sr-only">Search markets</span>
						<Search
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-low-emphasis"
							aria-hidden="true"
						/>
						<Input
							type="search"
							name="market-search"
							value={query}
							onChange={(event) => updateQuery(event.target.value)}
							autoComplete="off"
							placeholder="Search markets…"
							className="h-10 rounded-lg bg-l1 pl-9 shadow-sm"
						/>
					</label>
				</header>

				{marketsError && !markets.length ? (
					<Surface className="rounded-xl shadow-sm">
						<FeedbackState
							title="Failed to load markets"
							description={marketsError}
							action={
								<Button variant="secondary" size="sm" onClick={() => void refreshMarkets()}>
									Try again
								</Button>
							}
						/>
					</Surface>
				) : (
					<>
						{tickerError && (
							<InlineNotice
								tone="error"
								className="flex items-center justify-between gap-4 rounded-xl border border-red-text/20 bg-red-bg/20"
							>
								<span>
									Live ticker data is temporarily unavailable. Market prices may be incomplete.
								</span>
								<Button variant="ghost" size="sm" onClick={refreshTickers}>
									Retry
								</Button>
							</InlineNotice>
						)}

						<section aria-labelledby="live-markets-heading">
							{initialLoading ? (
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-fr">
									<MarketCardSkeleton featured />
									<MarketCardSkeleton />
									<MarketCardSkeleton />
								</div>
							) : filteredMarkets.length ? (
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-fr">
									{filteredMarkets.map((market, index) => (
										<MarketCard
											key={market.id}
											market={market}
											ticker={tickers[market.symbol]}
											featured={!query.trim() && index === 0}
										/>
									))}
								</div>
							) : (
								<Surface className="rounded-xl shadow-sm">
									<FeedbackState
										title={markets.length ? "No matching markets" : "No markets are live"}
										description={
											markets.length
												? "Try another asset name or symbol."
												: "Live markets will appear here when they open."
										}
										className="min-h-56"
									/>
								</Surface>
							)}
						</section>
					</>
				)}
			</PageContent>
		</Page>
	);
}
