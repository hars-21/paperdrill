import { useParams } from "react-router-dom";
import { MarketHeader } from "../components/market/market-header";
import { Orderbook } from "../components/market/orderbook";
import { Trades } from "../components/market/trades";
import { TradeForm } from "../components/market/trade-form";
import { DataPanel } from "../components/market/data-panel";
import { Chart } from "../components/market/chart";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "../components/ui/skeleton";
import type { DepthLevel, OrderBook, StreamResponse } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { Page } from "@/components/ui/page";
import { toast } from "sonner";

export function TradePage() {
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
			.catch((err) => {
				console.error("Failed to load depth:", err);
				toast.error("Failed to load orderbook");
			})
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

	const bookTradesTabs = (
		<div className="flex items-center justify-start flex-row gap-1">
			<button
				onClick={() => setLeftTab("book")}
				className={`flex justify-center flex-col cursor-pointer rounded-lg py-1 whitespace-nowrap text-[13px] font-semibold px-3 h-8 transition-colors ${
					leftTab === "book"
						? "text-high-emphasis bg-muted"
						: "text-medium-emphasis hover:text-high-emphasis"
				}`}
			>
				Book
			</button>
			<button
				onClick={() => setLeftTab("trades")}
				className={`flex justify-center flex-col cursor-pointer rounded-lg py-1 whitespace-nowrap text-[13px] font-semibold px-3 h-8 transition-colors ${
					leftTab === "trades"
						? "text-high-emphasis bg-muted"
						: "text-medium-emphasis hover:text-high-emphasis"
				}`}
			>
				Trades
			</button>
		</div>
	);

	return (
		<Page fixed className="px-4 gap-4 mb-2">
			<MarketHeader market={symbol} />

			<div className="hidden lg:flex gap-3 min-h-0">
				<div className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar gap-3 rounded-lg">
					<div className="flex gap-3 flex-1 min-h-155">
						<div className="flex flex-col bg-card border-border/40 w-1/3 max-w-75 min-w-65 overflow-hidden rounded-lg border shadow-sm">
							<div className="p-3 shrink-0">{bookTradesTabs}</div>
							<div className="flex-1 min-h-0">
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
						</div>

						<div className="flex-1 bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden flex flex-col min-h-0">
							{isDataLoading ? (
								<div className="flex-1 p-6 flex flex-col justify-between">
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
								<div className="flex-1 relative">
									<Chart symbol={symbol} />
								</div>
							)}
						</div>
					</div>

					<div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden shrink-0 min-h-75 max-h-screen">
						<DataPanel loading={isDataLoading} refreshKey={orderbookRefreshKey} symbol={symbol} />
					</div>
				</div>

				<div className="flex flex-row max-w-86 min-w-70 flex-[0.8] bg-card rounded-lg border border-border/40 shadow-sm overflow-y-auto no-scrollbar">
					<TradeForm symbol={symbol} onOrderPlaced={handleOrderPlaced} />
				</div>
			</div>

			<div className="flex flex-col gap-3 flex-1 lg:hidden">
				<div className="flex flex-col bg-card rounded-lg border border-border/40 shadow-sm w-full shrink-0 overflow-hidden">
					<div className="p-3 shrink-0">{bookTradesTabs}</div>
					<div className="min-h-64">
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
				</div>

				{isDataLoading ? (
					<div className="bg-card rounded-lg border border-border/40 shadow-sm p-6 flex flex-col justify-between min-h-75">
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
					<div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden min-h-75">
						<Chart symbol={symbol} />
					</div>
				)}

				<div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
					<TradeForm symbol={symbol} onOrderPlaced={handleOrderPlaced} />
				</div>

				<div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
					<DataPanel loading={isDataLoading} refreshKey={orderbookRefreshKey} symbol={symbol} />
				</div>
			</div>
		</Page>
	);
}
