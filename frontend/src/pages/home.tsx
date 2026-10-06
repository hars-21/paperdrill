import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketPulseChart } from "@/components/home/market-pulse-chart";
import { AssetIcon } from "@/components/icons/asset-icon";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import { useOpenOrders, useTradeHistory } from "@/hooks/use-account";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTickers } from "@/hooks/use-tickers";
import { getAssetColor } from "@/lib/asset-colors";
import { cn } from "@/lib/utils";
import type { Market, OrderRecord, Portfolio, Ticker, UserTrade } from "@/types";
import { formatChange, formatDateTime, formatPrice, formatQty, formatVolume } from "@/utils/format";

const MANAGEMENT_LINKS = [
	{
		to: "/markets",
		title: "Markets",
		description: "Compare live prices and choose where to trade.",
	},
	{
		to: "/portfolio",
		title: "Portfolio",
		description: "Review allocation, available credits and reserved funds.",
	},
	{
		to: "/activity",
		title: "Orders & trades",
		description: "Manage open orders and inspect execution history.",
	},
	{
		to: "/leaderboard",
		title: "Leaderboard",
		description: "See how your all-time return compares globally.",
	},
	{
		to: "/settings/api-keys",
		title: "API keys",
		description: "Connect bots and server-side trading clients.",
	},
] as const;

type ActivityItem = {
	id: string;
	kind: "order" | "trade";
	symbol: string;
	side: "BUY" | "SELL";
	qty: string;
	price: string | null;
	createdAt: string;
	detail: string;
};

function formatMoney(value?: string | number | null, precision = 2) {
	if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value))) {
		return "-";
	}
	return `$${formatPrice(value, precision)}`;
}

function formatQuoteVolume(value?: string | number) {
	const formatted = formatVolume(value);
	return formatted === "-" ? formatted : `$${formatted}`;
}

function MarketFocus({
	market,
	ticker,
	markets,
	loading,
	error,
	onSelect,
}: {
	market: Market | undefined;
	ticker: Ticker | undefined;
	markets: Market[];
	loading: boolean;
	error: string | null;
	onSelect: (symbol: string) => void;
}) {
	const symbol = market?.symbol ?? "BTC_USD";
	const baseAsset = market?.baseAsset ?? symbol.split("_")[0] ?? "BTC";
	const quoteAsset = market?.quoteAsset ?? symbol.split("_")[1] ?? "USD";
	const change = formatChange(ticker?.priceChangePercent);
	const positive = Number(ticker?.priceChangePercent ?? 0) >= 0;

	return (
		<section
			className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
			aria-labelledby="market-focus-title"
		>
			<div className="flex flex-col gap-4 border-b border-border/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div>
					<h2 id="market-focus-title" className="text-sm font-semibold text-high-emphasis">
						Market pulse
					</h2>
					<p className="mt-1 text-xs text-medium-emphasis">Live price and 72-hour movement.</p>
				</div>
				<div
					className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto"
					role="group"
					aria-label="Choose market"
				>
					{markets.map((item) => (
						<button
							key={item.symbol}
							type="button"
							onClick={() => onSelect(item.symbol)}
							aria-pressed={item.symbol === symbol}
							className={cn(
								"flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
								item.symbol === symbol
									? "bg-l3 text-high-emphasis"
									: "text-medium-emphasis hover:bg-l2 hover:text-high-emphasis",
							)}
						>
							<AssetIcon asset={item.baseAsset} className="size-5" />
							{item.baseAsset}
						</button>
					))}
				</div>
			</div>

			<div className="p-4 sm:p-5">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-center gap-3">
						<AssetIcon asset={baseAsset} className="size-11" />
						<div>
							<div className="flex items-baseline gap-1.5">
								<p className="font-semibold text-high-emphasis">{baseAsset}</p>
								<span className="text-xs text-low-emphasis">/{quoteAsset}</span>
							</div>
							<p className="text-xs text-medium-emphasis">
								{market?.name ?? symbol.replace("_", "/")}
							</p>
						</div>
					</div>

					<div className="sm:text-right">
						{loading && !ticker ? (
							<>
								<Skeleton className="h-8 w-36 sm:ml-auto" />
								<Skeleton className="mt-2 h-4 w-16 sm:ml-auto" />
							</>
						) : (
							<>
								<p className="text-2xl font-semibold tracking-tight text-high-emphasis tabular-nums sm:text-3xl">
									{formatMoney(ticker?.lastPrice, market?.pricePrecision)}
								</p>
								{ticker ? (
									<p
										className={cn(
											"mt-1 text-sm font-medium tabular-nums",
											change.isUp ? "text-green-text" : "text-red-text",
										)}
									>
										{change.text} today
									</p>
								) : (
									<p className="mt-1 text-xs text-medium-emphasis">Waiting for live price</p>
								)}
							</>
						)}
					</div>
				</div>

				<MarketPulseChart symbol={symbol} positive={positive} className="mt-5 h-64 sm:h-72" />

				<div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
					<div>
						<p className="text-[11px] text-medium-emphasis">24h high</p>
						<p className="mt-1 text-xs font-medium text-high-emphasis tabular-nums sm:text-sm">
							{formatMoney(ticker?.high, market?.pricePrecision)}
						</p>
					</div>
					<div>
						<p className="text-[11px] text-medium-emphasis">24h low</p>
						<p className="mt-1 text-xs font-medium text-high-emphasis tabular-nums sm:text-sm">
							{formatMoney(ticker?.low, market?.pricePrecision)}
						</p>
					</div>
					<div className="text-right">
						<p className="text-[11px] text-medium-emphasis">24h volume</p>
						<p className="mt-1 text-xs font-medium text-high-emphasis tabular-nums sm:text-sm">
							{formatQuoteVolume(ticker?.quoteVolume)}
						</p>
					</div>
				</div>

				<div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
					<p className="text-xs text-medium-emphasis">
						{error && !ticker ? "Live ticker data is delayed." : "Prices update as trades settle."}
					</p>
					<Button asChild variant="ghost" size="sm">
						<Link to={`/trade/${symbol}`}>
							Trade {baseAsset}
							<ArrowUpRight />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

function AccountSnapshot({
	portfolio,
	loading,
	openOrders,
}: {
	portfolio: Portfolio | null;
	loading: boolean;
	openOrders: number | null;
}) {
	const pnl = Number(portfolio?.pnl ?? 0);
	const quotePosition = portfolio?.positions.find(
		(position) => position.asset === portfolio.quoteAsset,
	);
	const equity = Number(portfolio?.equity ?? 0);
	const positions = (portfolio?.positions ?? [])
		.filter((position) => Number(position.value) > 0)
		.sort((left, right) => Number(right.value) - Number(left.value));

	return (
		<section
			className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
			aria-labelledby="account-snapshot-title"
		>
			<div className="flex items-center justify-between gap-4 border-b border-border/40 px-4 py-4 sm:px-5">
				<div>
					<h2 id="account-snapshot-title" className="text-sm font-semibold text-high-emphasis">
						Your account
					</h2>
					<p className="mt-1 text-xs text-medium-emphasis">Credits and current performance.</p>
				</div>
				<Link
					to="/portfolio"
					className="text-xs font-medium text-high-emphasis underline-offset-4 hover:underline"
				>
					View portfolio
				</Link>
			</div>

			<div className="flex flex-1 flex-col p-5 sm:p-6">
				{loading ? (
					<>
						<Skeleton className="h-3 w-28" />
						<Skeleton className="mt-3 h-10 w-56 max-w-full" />
						<Skeleton className="mt-3 h-4 w-40" />
					</>
				) : (
					<>
						<p className="text-xs text-medium-emphasis">Portfolio value</p>
						<p className="mt-2 text-3xl font-semibold tracking-tight text-high-emphasis tabular-nums">
							{portfolio
								? `${formatPrice(portfolio.equity)} ${portfolio.quoteAsset}`
								: "Unavailable"}
						</p>
						{portfolio ? (
							<div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
								<span
									className={cn(
										"font-semibold tabular-nums",
										pnl >= 0 ? "text-green-text" : "text-red-text",
									)}
								>
									{pnl > 0 ? "+" : ""}{formatPrice(portfolio.pnl)} {portfolio.quoteAsset}
								</span>
								<span
									className={cn(
										"tabular-nums",
										pnl >= 0 ? "text-green-text" : "text-red-text",
									)}
								>
									{pnl > 0 ? "+" : ""}{portfolio.pnlPercent}%
								</span>
							</div>
						) : null}
					</>
				)}

				{loading ? (
					<>
						<div className="mt-7 space-y-4 border-t border-border/40 pt-5">
							<div className="flex items-center justify-between gap-3">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-24" />
							</div>
							<Skeleton className="h-2 w-full rounded-full" />
							<Skeleton className="h-3 w-40" />
							<Skeleton className="h-3 w-32" />
						</div>
						<div className="mt-auto grid grid-cols-2 gap-4 border-t border-border/40 pt-5">
							<div className="space-y-2">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 w-28" />
							</div>
							<div className="ml-auto space-y-2">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="ml-auto h-4 w-8" />
							</div>
						</div>
					</>
				) : (
					<>
						<div className="mt-7 border-t border-border/40 pt-5">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-medium text-high-emphasis">Capital split</p>
								<p className="text-xs text-medium-emphasis">
									{positions.length} {positions.length === 1 ? "funded asset" : "funded assets"}
								</p>
							</div>
							<div
								className="mt-3 flex h-2 overflow-hidden rounded-full bg-l3/70"
								role="img"
								aria-label="Current portfolio allocation"
							>
								{positions.map((position) => (
									<span
										key={position.asset}
										style={{
											width: `${equity > 0 ? (Number(position.value) / equity) * 100 : 0}%`,
											backgroundColor: getAssetColor(position.asset),
										}}
									/>
								))}
							</div>
							<div className="mt-4 space-y-2.5">
								{positions.slice(0, 4).map((position) => (
									<div key={position.asset} className="flex items-center gap-3">
										<span
											className="size-2 shrink-0 rounded-full"
											style={{
												backgroundColor: getAssetColor(position.asset),
											}}
										/>
										<span className="min-w-0 flex-1 truncate text-xs font-medium text-high-emphasis">
											{position.asset}
										</span>
										<span className="text-xs text-medium-emphasis tabular-nums">
											{equity > 0 ? ((Number(position.value) / equity) * 100).toFixed(1) : "0.0"}%
										</span>
									</div>
								))}
							</div>
						</div>

						<div className="mt-auto grid grid-cols-2 gap-4 border-t border-border/40 pt-5">
							<div>
								<p className="text-xs text-medium-emphasis">Available cash</p>
								<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
									{quotePosition && portfolio
										? `${formatPrice(quotePosition.available)} ${portfolio.quoteAsset}`
										: "-"}
								</p>
							</div>
							<div className="text-right">
								<p className="text-xs text-medium-emphasis">Open orders</p>
								{openOrders === null ? (
									<Skeleton className="mt-1.5 ml-auto h-4 w-8" />
								) : (
									<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
										{openOrders}
									</p>
								)}
							</div>
						</div>
					</>
				)}
			</div>
		</section>
	);
}

function ActivityFeed({
	items,
	markets,
	loading,
}: {
	items: ActivityItem[];
	markets: Map<string, Market>;
	loading: boolean;
}) {
	return (
		<section
			className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
			aria-labelledby="recent-activity-title"
		>
			<div className="flex items-center justify-between gap-4 border-b border-border/40 px-4 py-4 sm:px-5">
				<div>
					<h2 id="recent-activity-title" className="text-sm font-semibold text-high-emphasis">
						Recent activity
					</h2>
					<p className="mt-1 text-xs text-medium-emphasis">Open orders and completed trades.</p>
				</div>
				<Link
					to="/activity"
					className="text-xs font-medium text-high-emphasis underline-offset-4 hover:underline"
				>
					View all
				</Link>
			</div>

			{loading ? (
				<div className="divide-y divide-border/30">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className="flex items-center gap-3 px-4 py-4 sm:px-5">
							<Skeleton className="size-9 shrink-0 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3.5 w-36" />
								<Skeleton className="h-3 w-24" />
							</div>
							<Skeleton className="h-4 w-28" />
						</div>
					))}
				</div>
			) : items.length ? (
				<div className="divide-y divide-border/30">
					{items.map((item) => {
						const market = markets.get(item.symbol);
						const baseAsset = market?.baseAsset ?? item.symbol.split("_")[0] ?? item.symbol;
						return (
							<div
								key={`${item.kind}-${item.id}`}
								className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
							>
								<AssetIcon asset={baseAsset} className="size-9 shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-high-emphasis">
										<span className={item.side === "BUY" ? "text-green-text" : "text-red-text"}>
											{item.side === "BUY" ? "Buy" : "Sell"}
										</span>{" "}
										{item.kind === "order" ? "order open" : "trade completed"}
									</p>
									<p className="mt-0.5 truncate text-xs text-medium-emphasis">
										{item.symbol.replace("_", "/")}, {item.detail}
									</p>
								</div>
								<div className="shrink-0 text-right">
									<p className="text-sm font-medium text-high-emphasis tabular-nums">
										{formatQty(item.qty, market?.qtyPrecision)} {baseAsset}
									</p>
									<p className="mt-0.5 text-xs text-medium-emphasis tabular-nums">
										{item.price ? `at ${formatPrice(item.price, market?.pricePrecision)}` : "Market price"}
									</p>
								</div>
								<p className="hidden w-28 shrink-0 text-right text-xs text-low-emphasis sm:block">
									{formatDateTime(item.createdAt)}
								</p>
							</div>
						);
					})}
				</div>
			) : (
				<div className="flex min-h-56 items-center justify-center px-6 py-10 text-center">
					<div className="max-w-sm">
						<p className="text-sm font-semibold text-high-emphasis">No trading activity yet</p>
						<p className="mt-1.5 text-sm leading-6 text-medium-emphasis">
							Place your first order to start building a trading record.
						</p>
						<Button asChild size="sm" className="mt-4">
							<Link to="/markets">Browse markets</Link>
						</Button>
					</div>
				</div>
			)}
		</section>
	);
}

function ManagementRail() {
	return (
		<section
			className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
			aria-labelledby="manage-paperdrill-title"
		>
			<div className="border-b border-border/40 px-4 py-4 sm:px-5">
				<h2 id="manage-paperdrill-title" className="text-sm font-semibold text-high-emphasis">
					Manage PaperDrill
				</h2>
				<p className="mt-1 text-xs text-medium-emphasis">Move directly to the work you need.</p>
			</div>
			<nav aria-label="Account destinations" className="divide-y divide-border/30">
				{MANAGEMENT_LINKS.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						className="group flex items-center gap-4 px-4 py-3.5 outline-none transition-colors hover:bg-l2/50 focus-visible:bg-l2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
					>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium text-high-emphasis">{item.title}</p>
							<p className="mt-0.5 truncate text-xs text-medium-emphasis">{item.description}</p>
						</div>
						<ArrowUpRight className="size-4 shrink-0 text-low-emphasis transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-high-emphasis" />
					</Link>
				))}
			</nav>
		</section>
	);
}

function buildActivity(openOrders: OrderRecord[], trades: UserTrade[]) {
	const orders: ActivityItem[] = openOrders.map((order) => ({
		id: order.id,
		kind: "order",
		symbol: order.symbol,
		side: order.side,
		qty: order.qty,
		price: order.price,
		createdAt: order.createdAt,
		detail: `${order.type === "MARKET" ? "Market" : "Limit"} order`,
	}));
	const executions: ActivityItem[] = trades.map((trade) => ({
		id: trade.id,
		kind: "trade",
		symbol: trade.symbol,
		side: trade.side,
		qty: trade.qty,
		price: trade.price,
		createdAt: trade.createdAt,
		detail: trade.isMaker ? "Maker execution" : "Taker execution",
	}));

	return [...orders, ...executions]
		.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
		.slice(0, 6);
}

export function HomePage() {
	const { user, verified } = useAuth();
	const { markets, loading: marketsLoading, error: marketsError } = useMarkets();
	const { tickers, loading: tickersLoading, error: tickersError } = useTickers();
	const { portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolio();
	const { openOrders, loading: openOrdersLoading, error: openOrdersError } = useOpenOrders();
	const { trades, loading: tradesLoading, error: tradesError } = useTradeHistory(6);
	const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
	const featuredMarkets = useMemo(() => markets.slice(0, 3), [markets]);
	const focusMarket =
		markets.find((market) => market.symbol === selectedSymbol) ?? featuredMarkets[0] ?? markets[0];
	const focusSymbol = focusMarket?.symbol ?? "BTC_USD";
	const activity = useMemo(() => buildActivity(openOrders, trades), [openOrders, trades]);
	const marketBySymbol = useMemo(
		() => new Map(markets.map((market) => [market.symbol, market])),
		[markets],
	);
	const accountError = portfolioError ?? openOrdersError ?? tradesError;
	const marketError = tickersError ?? marketsError;
	const firstName = user?.name.trim().split(/\s+/)[0] ?? "trader";

	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">
							Welcome back, {firstName}
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
							Markets, account performance and trading activity in one place.
						</p>
					</div>
					<Button asChild size="sm">
						<Link to={`/trade/${focusSymbol}`}>Trade</Link>
					</Button>
				</header>

				{!verified ? (
					<InlineNotice className="rounded-xl border border-border/60 bg-l2/60">
						Verify your email to place orders and create API keys. {" "}
						<Link to="/verify-email" state={{ returnTo: "/home" }} className="font-medium text-high-emphasis underline underline-offset-4">
							Verify email
						</Link>
					</InlineNotice>
				) : null}

				{accountError ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						Some account information could not be refreshed. Available data is still shown.
					</InlineNotice>
				) : null}

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(21rem,.75fr)]">
					<MarketFocus
						market={focusMarket}
						ticker={tickers[focusSymbol]}
						markets={featuredMarkets}
						loading={marketsLoading || tickersLoading}
						error={marketError}
						onSelect={setSelectedSymbol}
					/>
					<AccountSnapshot
						portfolio={portfolio}
						loading={portfolioLoading}
						openOrders={openOrdersLoading ? null : openOrders.length}
					/>
				</div>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
					<ActivityFeed
						items={activity}
						markets={marketBySymbol}
						loading={openOrdersLoading || tradesLoading}
					/>
					<ManagementRail />
				</div>
			</PageContent>
		</Page>
	);
}
