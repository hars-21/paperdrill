import { useState } from "react";
import { useParams } from "react-router-dom";
import { Chart } from "../components/chart";
import { DataPanel } from "../components/market/data-panel";
import { MarketHeader } from "../components/market/market-header";
import { MarketWatchlist } from "../components/market/market-watchlist";
import { Orderbook } from "../components/market/orderbook";
import { TradeForm } from "../components/market/trade-form";
import { Trades } from "../components/market/trades";
import { Page } from "../components/ui/page";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import { useOrderbook } from "@/hooks/use-orderbook";
import { useTickers } from "@/hooks/use-tickers";
import { useTrades } from "@/hooks/use-trades";

export function TradePage() {
	const { symbol = "BTC_USD" } = useParams();
	const { loading: authLoading, authenticated, verified } = useAuth();
	const { markets } = useMarkets();
	const { tickers, loading: tickerLoading } = useTickers();
	const [orderbookRefreshKey, setOrderbookRefreshKey] = useState(0);
	const [leftTab, setLeftTab] = useState<"book" | "trades">("book");
	const { orderbook, loading: orderbookLoading, bestBid, bestAsk } = useOrderbook(symbol);
	const { trades, loading: tradesLoading } = useTrades(symbol);
	const ticker = tickers[symbol] ?? null;
	const isDataLoading = authLoading || orderbookLoading || tradesLoading || tickerLoading;

	const bookTradesTabs = (
		<div className="flex items-center gap-1">
			<button
				type="button"
				onClick={() => setLeftTab("book")}
				className={`flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
					leftTab === "book"
						? "bg-muted text-high-emphasis"
						: "text-medium-emphasis hover:text-high-emphasis"
				}`}
			>
				Book
			</button>
			<button
				type="button"
				onClick={() => setLeftTab("trades")}
				className={`flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
					leftTab === "trades"
						? "bg-muted text-high-emphasis"
						: "text-medium-emphasis hover:text-high-emphasis"
				}`}
			>
				Trades
			</button>
		</div>
	);

	return (
		<Page fixed className="px-2 pb-2 sm:px-4">
			<div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,21.5rem)] lg:grid-rows-[auto_minmax(38rem,1fr)_auto]">
				<div className="lg:col-start-1 lg:row-start-1">
					<MarketHeader symbol={symbol} markets={markets} tickers={tickers} />
				</div>

				<div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:flex-row">
					<div className="hidden w-1/3 min-w-65 max-w-75 flex-col overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm lg:flex">
						<div className="shrink-0 p-3">{bookTradesTabs}</div>
						<div className="min-h-0 flex-1">
							{leftTab === "book" ? (
								<Orderbook
									bids={orderbook.bids}
									asks={orderbook.asks}
									loading={isDataLoading}
									symbol={symbol}
									lastPrice={ticker?.lastPrice}
								/>
							) : (
								<Trades symbol={symbol} loading={isDataLoading} trades={trades} />
							)}
						</div>
					</div>

					<div className="flex h-96 w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm lg:hidden">
						<div className="shrink-0 p-3">{bookTradesTabs}</div>
						<div className="min-h-0 flex-1">
							{leftTab === "book" ? (
								<Orderbook
									compact
									bids={orderbook.bids}
									asks={orderbook.asks}
									loading={isDataLoading}
									symbol={symbol}
									lastPrice={ticker?.lastPrice}
								/>
							) : (
								<Trades symbol={symbol} loading={isDataLoading} trades={trades.slice(0, 25)} />
							)}
						</div>
					</div>

					<div className="relative min-h-96 flex-1 overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm lg:min-h-0">
						{isDataLoading ? (
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
						) : (
							<Chart symbol={symbol} orderbook={orderbook} ticker={ticker} />
						)}
					</div>
				</div>

				<div className="flex h-fit min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:row-span-3">
					<div className="overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm">
						<TradeForm
							symbol={symbol}
							loading={isDataLoading}
							lastPrice={ticker?.lastPrice}
							bestBid={bestBid}
							bestAsk={bestAsk}
							onOrderPlaced={() => setOrderbookRefreshKey((key) => key + 1)}
						/>
					</div>
					<div className="hidden lg:block">
						<MarketWatchlist symbol={symbol} markets={markets} tickers={tickers} />
					</div>
				</div>

				<div
					className={`overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm lg:col-start-1 lg:row-start-3 ${authenticated && verified ? "lg:min-h-144" : "lg:min-h-75"}`}
				>
					<DataPanel loading={isDataLoading} refreshKey={orderbookRefreshKey} symbol={symbol} />
				</div>
			</div>
		</Page>
	);
}
