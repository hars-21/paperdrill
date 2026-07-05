import { useParams, Link } from "react-router-dom";
import { AppLayout } from "../components/app-layout";
import { MarketHeader } from "../components/market/market-header";
import { Orderbook } from "../components/market/orderbook";
import { Trades } from "../components/market/trades";
import { TradeForm } from "../components/market/trade-form";
import { OpenOrders } from "../components/market/open-orders";
import { Chart } from "../components/market/chart";
import { Button } from "../components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "../components/ui/skeleton";
import type { DepthLevel, OrderBook, StreamResponse } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";

export function MarketPage() {
	const { symbol = "BTC_USD" } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [orderbookRefreshKey, setOrderbookRefreshKey] = useState(0);

	const [orderbook, setOrderbook] = useState<OrderBook>({
		bids: {},
		asks: {},
	});
	const bufferRef = useRef<StreamResponse[]>([]);
	const [leftTab, setLeftTab] = useState<"book" | "trades">("book");

	useEffect(() => {
		setLoading(true);
		setOrderbook({ bids: {}, asks: {} });
		bufferRef.current = [];

		let orderbookInitialized = false;

		const handleDepth = (raw: unknown) => {
			const data = raw as StreamResponse;
			if (!orderbookInitialized) {
				bufferRef.current.push(data);
			} else {
				updateOrderbook(data.bids, data.asks);
			}
		};

		const unsubscribe = wsManager.subscribe(`depth:${symbol}`, handleDepth);

		api
			.getDepth(symbol)
			.then(({ bids, asks, lastUpdateId }) => {
				initializeOrderbook(bids, asks);
				orderbookInitialized = true;
				bufferRef.current.forEach((msg) => {
					if (msg.lastUpdateId > lastUpdateId) {
						updateOrderbook(msg.bids, msg.asks);
					}
				});
				bufferRef.current = [];
			})
			.catch(() => {})
			.finally(() => setLoading(false));

		return () => {
			unsubscribe();
		};
	}, [symbol]);

	const initializeOrderbook = (bids: DepthLevel[], asks: DepthLevel[]) => {
		const bidsMap: Record<string, string> = {};
		const asksMap: Record<string, string> = {};
		bids.forEach(({ price, qty }) => {
			bidsMap[price] = qty;
		});
		asks.forEach(({ price, qty }) => {
			asksMap[price] = qty;
		});
		setOrderbook({ bids: bidsMap, asks: asksMap });
	};

	const updateOrderbook = (updatedBids: DepthLevel[], updatedAsks: DepthLevel[]) => {
		setOrderbook((prev) => {
			const bids = { ...prev.bids };
			const asks = { ...prev.asks };
			updatedBids.forEach(({ price, qty }) => {
				if (qty === "0") delete bids[price];
				else bids[price] = qty;
			});
			updatedAsks.forEach(({ price, qty }) => {
				if (qty === "0") delete asks[price];
				else asks[price] = qty;
			});
			return { bids, asks };
		});
	};

	const handleOrderPlaced = () => {
		setOrderbookRefreshKey((k) => k + 1);
	};

	const isDataLoading = loading || authLoading;

	return (
		<AppLayout>
			<div className="flex flex-col h-[calc(100vh-48px)] p-4 gap-4 bg-background/40 overflow-hidden">
				<MarketHeader market={symbol} />

				<div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
					<div className="flex flex-col bg-card rounded-xl border border-border/40 shadow-xs lg:w-72 xl:w-80 shrink-0 h-full overflow-hidden">
						<div className="flex border-b border-border/40">
							<button
								onClick={() => setLeftTab("book")}
								className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
									leftTab === "book"
										? "text-foreground border-b-2 border-primary"
										: "text-muted-foreground/60 hover:text-foreground"
								}`}
							>
								Orderbook
							</button>
							<button
								onClick={() => setLeftTab("trades")}
								className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
									leftTab === "trades"
										? "text-foreground border-b-2 border-primary"
										: "text-muted-foreground/60 hover:text-foreground"
								}`}
							>
								Trades
							</button>
						</div>

						{leftTab === "book" ? (
							<Orderbook
								bids={orderbook.bids}
								asks={orderbook.asks}
								loading={isDataLoading}
								symbol={symbol}
							/>
						) : (
							<Trades symbol={symbol} loading={isDataLoading} />
						)}
					</div>

					<div className="flex flex-1 flex-col gap-4 h-full min-w-0">
						{isDataLoading ? (
							<div className="flex-1 bg-card rounded-xl border border-border/40 shadow-xs p-6 flex flex-col justify-between min-h-50 animate-pulse">
								<div className="flex justify-between items-center">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-4 w-12" />
								</div>
								<div className="flex-1 flex flex-col justify-end gap-2.5 py-6">
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
							<div className="flex-1 bg-card rounded-xl border border-border/40 shadow-xs min-h-50 overflow-hidden p-1">
								<Chart symbol={symbol} />
							</div>
						)}

						<div className="bg-card rounded-xl border border-border/40 shadow-xs overflow-hidden h-55 shrink-0">
							<OpenOrders loading={isDataLoading} refreshKey={orderbookRefreshKey} />
						</div>
					</div>

					<div className="flex flex-col bg-card rounded-xl border border-border/40 shadow-xs lg:w-72 xl:w-80 shrink-0 h-full overflow-hidden">
						{user ? (
							<TradeForm symbol={symbol} onOrderPlaced={handleOrderPlaced} />
						) : (
							<div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
								<p className="text-sm text-muted-foreground">Sign in to start trading</p>
								<Link to="/login">
									<Button size="sm">Sign in</Button>
								</Link>
							</div>
						)}
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
