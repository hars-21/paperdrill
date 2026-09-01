import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Market } from "@/types";
import { api } from "@/lib/api";

type MarketContextValue = {
	markets: Market[];
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	getMarket: (symbol: string) => Market | undefined;
};

const MarketContext = createContext<MarketContextValue | null>(null);

export const MarketProvider = ({ children }: { children: React.ReactNode }) => {
	const [markets, setMarkets] = useState<Market[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			const res = await api.getMarkets();
			setMarkets(res.data ?? []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load markets");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const bySymbol = useMemo(() => {
		const map = new Map<string, Market>();
		for (const m of markets) map.set(m.symbol, m);
		return map;
	}, [markets]);

	const getMarket = useCallback((symbol: string) => bySymbol.get(symbol), [bySymbol]);

	const value = useMemo(
		() => ({ markets, loading, error, refresh, getMarket }),
		[markets, loading, error, refresh, getMarket],
	);

	return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
};

export function useMarkets() {
	const context = useContext(MarketContext);
	if (!context) throw new Error("useMarkets must be used within MarketProvider");
	return context;
}

export function useMarket(symbol: string) {
	const { getMarket } = useMarkets();
	return getMarket(symbol);
}
