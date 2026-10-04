import { CircleAlert } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Chart } from "../components/chart";
import { DataPanel } from "../components/market/data-panel";
import { MarketHeader } from "../components/market/market-header";
import { MarketWatchlist } from "../components/market/market-watchlist";
import { Orderbook } from "../components/market/orderbook";
import { TradeForm } from "../components/market/trade-form";
import { Trades } from "../components/market/trades";
import { Page } from "../components/ui/page";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { FeedbackState } from "../components/ui/feedback-state";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import { useOrderbook } from "@/hooks/use-orderbook";
import { useTickers } from "@/hooks/use-tickers";
import { useTrades } from "@/hooks/use-trades";

export function TradePage() {
	const { symbol = "BTC_USD" } = useParams();
	const { loading: authLoading, authenticated, verified } = useAuth();
	const { markets, loading: marketsLoading, error: marketsError, refresh } = useMarkets();
	const { tickers, loading: tickerLoading, error: tickerError, refresh: refreshTickers } = useTickers();
	const [searchParams, setSearchParams] = useSearchParams();
	const leftTab = searchParams.get("panel") === "trades" ? "trades" : "book";
	const {
		orderbook,
		loading: orderbookLoading,
		error: orderbookError,
		refresh: refreshOrderbook,
		bestBid,
		bestAsk,
	} = useOrderbook(symbol);
	const { trades, loading: tradesLoading, error: tradesError, refresh: refreshTrades } = useTrades(symbol);
	const ticker = tickers[symbol] ?? null;
	const marketExists = markets.some((market) => market.symbol === symbol);

	const setLeftTab = (tab: "book" | "trades") => {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			if (tab === "book") next.delete("panel");
			else next.set("panel", tab);
			return next;
		});
	};

	const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		const nextTab = event.key === "ArrowRight" || event.key === "End" ? "trades" : "book";
		setLeftTab(nextTab);
		document.getElementById(`${nextTab}-tab`)?.focus();
	};

	const bookTradesTabs = (
		<div className="flex items-center gap-1" role="tablist" aria-label="Market data">
			<button
				id="book-tab"
				type="button"
				role="tab"
				aria-selected={leftTab === "book"}
				aria-controls="market-data-panel"
				onClick={() => setLeftTab("book")}
				onKeyDown={handleTabKeyDown}
				tabIndex={leftTab === "book" ? 0 : -1}
				className={`flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
					leftTab === "book"
						? "bg-muted text-high-emphasis"
						: "text-medium-emphasis hover:text-high-emphasis"
				}`}
			>
				Book
			</button>
			<button
				id="trades-tab"
				type="button"
				role="tab"
				aria-selected={leftTab === "trades"}
				aria-controls="market-data-panel"
				onClick={() => setLeftTab("trades")}
				onKeyDown={handleTabKeyDown}
				tabIndex={leftTab === "trades" ? 0 : -1}
				className={`flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
					leftTab === "trades"
						? "bg-muted text-high-emphasis"
						: "text-medium-emphasis hover:text-high-emphasis"
				}`}
			>
				Trades
			</button>
		</div>
	);

	if (marketsLoading && markets.length === 0) {
		return (
			<Page>
				<FeedbackState title="Loading market…" className="flex-1" />
			</Page>
		);
	}

	if (marketsError && markets.length === 0) {
		return (
			<Page>
				<FeedbackState
					icon={CircleAlert}
					title="Could not load this market"
					description={marketsError}
					className="flex-1"
					action={<Button onClick={() => void refresh()}>Try again</Button>}
				/>
			</Page>
		);
	}

	if (!marketExists) {
		return (
			<Page>
				<FeedbackState
					icon={CircleAlert}
					title="Market not found"
					description={`${symbol.replace("_", "/")} is not available on PaperDrill.`}
					className="flex-1"
					action={
						<Button asChild>
							<Link to="/markets">Browse markets</Link>
						</Button>
					}
				/>
			</Page>
		);
	}

	return (
		<Page fixed className="safe-area-bottom px-2 sm:px-4">
			<div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto scrollbar-gutter-stable lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)_minmax(17.5rem,21.5rem)] lg:grid-rows-[auto_clamp(30rem,60dvh,36rem)_auto]">
				<div className="order-1 lg:col-span-2 lg:col-start-1 lg:row-start-1">
					<MarketHeader symbol={symbol} markets={markets} tickers={tickers} />
				</div>

				<div className="relative order-2 min-h-80 overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm sm:min-h-96 lg:col-start-2 lg:row-start-2 lg:min-h-0">
					{tickerLoading && !ticker ? (
						<div className="flex h-full flex-col justify-between p-6">
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-12" />
							</div>
							<div className="flex flex-1 flex-col justify-end gap-2.5 py-6">
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-5 w-5/6" />
								<Skeleton className="h-3.5 w-full" />
							</div>
							<div className="flex justify-between">
								<Skeleton className="h-3 w-8" />
								<Skeleton className="h-3 w-8" />
								<Skeleton className="h-3 w-8" />
							</div>
						</div>
					) : tickerError && !ticker ? (
						<FeedbackState
							icon={CircleAlert}
							title="Chart unavailable"
							description={tickerError}
							className="h-full min-h-0"
							action={<Button variant="secondary" size="sm" onClick={refreshTickers}>Try again</Button>}
						/>
					) : (
						<Chart symbol={symbol} orderbook={orderbook} ticker={ticker} />
					)}
				</div>

				<div className="order-3 flex h-fit min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:col-start-3 lg:row-start-1 lg:row-span-3">
					<div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
						<TradeForm
							symbol={symbol}
							loading={tickerLoading && !ticker}
							lastPrice={ticker?.lastPrice}
							bestBid={bestBid}
							bestAsk={bestAsk}
						/>
					</div>
					<div className="hidden lg:block">
						<MarketWatchlist symbol={symbol} markets={markets} tickers={tickers} />
					</div>
				</div>

				<div className="order-4 flex h-80 min-w-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm sm:h-96 lg:col-start-1 lg:row-start-2 lg:h-auto lg:min-h-0">
					<div className="shrink-0 p-3">{bookTradesTabs}</div>
					<div
						id="market-data-panel"
						role="tabpanel"
						aria-labelledby={leftTab === "book" ? "book-tab" : "trades-tab"}
						className="min-h-0 flex-1"
					>
						{leftTab === "book" ? (
							<Orderbook
								bids={orderbook.bids}
								asks={orderbook.asks}
								loading={orderbookLoading}
								error={orderbookError}
								onRetry={refreshOrderbook}
								symbol={symbol}
								lastPrice={ticker?.lastPrice}
							/>
						) : (
							<Trades
								symbol={symbol}
								loading={tradesLoading}
								error={tradesError}
								onRetry={refreshTrades}
								trades={trades}
							/>
						)}
					</div>
				</div>

				<div
					className={`order-5 overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm lg:col-span-2 lg:col-start-1 lg:row-start-3 ${authenticated && verified ? "lg:min-h-144" : "lg:min-h-75"}`}
				>
					<DataPanel loading={authLoading} symbol={symbol} />
				</div>
			</div>
		</Page>
	);
}
