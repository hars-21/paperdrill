import { useEffect, useMemo, useRef, useState } from "react";
import type { DepthLevel, OrderBook, StreamResponse } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";

export function useOrderbook(symbol: string) {
	const [orderbook, setOrderbook] = useState<OrderBook>({ bids: {}, asks: {} });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const bufferRef = useRef<StreamResponse[]>([]);

	useEffect(() => {
		setLoading(true);
		setOrderbook({ bids: {}, asks: {} });
		setError(null);
		bufferRef.current = [];

		let orderbookInitialized = false;

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

		const handleDepth = (raw: unknown) => {
			const data = raw as StreamResponse;
			if (!orderbookInitialized) {
				bufferRef.current.push(data);
			} else {
				updateOrderbook(data.bids, data.asks);
			}
		};

		let active = true;
		const unsubscribe = wsManager.subscribe(`depth:${symbol}`, handleDepth);

		api
			.getDepth(symbol)
			.then(({ bids, asks, lastUpdateId }) => {
				if (!active) return;
				const bidsMap: Record<string, string> = {};
				const asksMap: Record<string, string> = {};
				bids.forEach(({ price, qty }) => {
					bidsMap[price] = qty;
				});
				asks.forEach(({ price, qty }) => {
					asksMap[price] = qty;
				});
				setOrderbook({ bids: bidsMap, asks: asksMap });
				orderbookInitialized = true;
				bufferRef.current.forEach((msg) => {
					if (msg.lastUpdateId > lastUpdateId) {
						updateOrderbook(msg.bids, msg.asks);
					}
				});
				bufferRef.current = [];
			})
			.catch((err) => {
				if (!active) return;
				setError(err instanceof Error ? err.message : "Failed to load order book");
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
			unsubscribe();
		};
	}, [symbol]);

	const bestBid = useMemo(() => {
		const prices = Object.keys(orderbook.bids).map(Number).filter(Number.isFinite);
		return prices.length ? String(Math.max(...prices)) : null;
	}, [orderbook.bids]);

	const bestAsk = useMemo(() => {
		const prices = Object.keys(orderbook.asks).map(Number).filter(Number.isFinite);
		return prices.length ? String(Math.min(...prices)) : null;
	}, [orderbook.asks]);

	return { orderbook, loading, error, bestBid, bestAsk };
}
