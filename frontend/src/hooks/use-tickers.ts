import { useEffect, useState } from "react";
import type { Ticker } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { useMarkets } from "@/context/MarketContext";

export function useTicker(symbol: string) {
	const [ticker, setTicker] = useState<Ticker | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setTicker(null);
		setError(null);

		api
			.getTicker(symbol)
			.then((data) => {
				if (!active) return;
				setTicker(data);
			})
			.catch((err) => {
				if (!active) return;
				setError(err instanceof Error ? err.message : "Failed to load ticker");
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		const unsubscribe = wsManager.subscribe(`ticker:${symbol}`, (msg: unknown) => {
			const data = msg as Ticker;
			if (!data?.symbol) return;
			setTicker((prev) => (prev && prev.symbol === data.symbol ? { ...prev, ...data } : data));
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, [symbol]);

	return { ticker, loading, error };
}

export function useTickers() {
	const { markets } = useMarkets();
	const [tickers, setTickers] = useState<Record<string, Ticker>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		let unsubs: (() => void)[] = [];

		setLoading(true);

		api
			.getAllTickers()
			.then((data) => {
				if (!active) return;
				const map: Record<string, Ticker> = {};
				for (const t of data) {
					if (t?.symbol) map[t.symbol] = t;
				}
				setTickers(map);

				unsubs = markets.map((m) =>
					wsManager.subscribe(`ticker:${m.symbol}`, (msg: unknown) => {
						const data = msg as Ticker;
						if (!data?.symbol) return;
						setTickers((prev) => ({ ...prev, [data.symbol]: data }));
					}),
				);
			})
			.catch((err) => {
				if (!active) return;
				console.error("Failed to load tickers:", err);
				setError(err instanceof Error ? err.message : "Failed to load tickers");
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
			unsubs.forEach((u) => u());
		};
	}, [markets]);

	return { tickers, loading, error };
}
