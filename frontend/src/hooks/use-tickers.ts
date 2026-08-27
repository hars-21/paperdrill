import { useEffect, useState } from "react";
import type { Market, Ticker } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";

export function useTickers() {
	const [markets, setMarkets] = useState<Market[]>([]);
	const [tickers, setTickers] = useState<Record<string, Ticker>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		let unsubs: (() => void)[] = [];

		setLoading(true);

		api
			.getMarkets()
			.then(async (res) => {
				const list = res.data ?? [];
				if (!active) return;
				setMarkets(list);

				const results = await Promise.all(
					list.map((m) => api.getTicker(m.symbol).catch(() => null)),
				);
				if (!active) return;

				const map: Record<string, Ticker> = {};
				for (const t of results) {
					if (t) map[t.symbol] = t;
				}
				setTickers(map);

				unsubs = list.map((m) =>
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
	}, []);

	return { markets, tickers, loading, error };
}