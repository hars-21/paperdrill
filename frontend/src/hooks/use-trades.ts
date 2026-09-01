import { useEffect, useState } from "react";
import type { Trade } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";

export function useTrades(symbol: string, limit = 50) {
	const [trades, setTrades] = useState<Trade[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setTrades([]);
		setError(null);

		api
			.getTrades(symbol, limit)
			.then((data) => {
				if (!active) return;
				const mapped = data.map((f) => ({
					id: f.id,
					price: f.price,
					qty: f.qty,
					maker: f.isBuyerMaker,
					timestamp: f.createdAt,
				}));
				setTrades(mapped);
			})
			.catch((err) => {
				if (!active) return;
				setError(err instanceof Error ? err.message : "Failed to load trades");
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		const handleTrade = (msg: unknown) => {
			const data = msg as Record<string, unknown>;
			if (data.event === "trade") {
				const trade: Trade = {
					id: String(data.id ?? ""),
					price: String(data.price ?? "0"),
					qty: String(data.qty ?? "0"),
					maker: Boolean(data.maker),
					timestamp: Number(data.timestamp) || Date.now(),
				};
				setTrades((prev) => [trade, ...prev].slice(0, limit));
			}
		};

		const unsubscribe = wsManager.subscribe(`trade:${symbol}`, handleTrade);

		return () => {
			active = false;
			unsubscribe();
		};
	}, [symbol, limit]);

	return { trades, loading, error };
}
