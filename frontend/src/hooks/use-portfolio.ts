import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { accountQueryKeys } from "@/lib/query-client";
import type { PortfolioHistoryRange } from "@/types";

type UsePortfolioOptions = {
	enabled?: boolean;
};

export function usePortfolio({ enabled = true }: UsePortfolioOptions = {}) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.portfolio(user?.id ?? "anonymous"),
		queryFn: api.getPortfolio,
		enabled: active,
		staleTime: 30_000,
		// Live updates arrive over the account WebSocket. The interval is only a
		// safety net for reconnects or proxies that drop long-lived connections.
		refetchInterval: 60_000,
	});

	return {
		portfolio: query.data ?? null,
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}

export function usePortfolioHistory(range: PortfolioHistoryRange) {
	const { user } = useAuth();
	const userId = user?.id ?? "anonymous";
	const active = Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.portfolioHistory(userId, range),
		queryFn: () => api.getPortfolioHistory(range),
		enabled: active,
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});

	return {
		history: query.data ?? null,
		loading: active && query.isPending,
		fetching: query.isFetching,
		error: query.data === undefined ? query.error : null,
	};
}

export function usePortfolioAnalytics({ enabled = true }: UsePortfolioOptions = {}) {
	const { user } = useAuth();
	const userId = user?.id ?? "anonymous";
	const active = enabled && Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.portfolioAnalytics(userId),
		queryFn: api.getPortfolioAnalytics,
		enabled: active,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});

	return {
		analytics: query.data ?? null,
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
	};
}

export function usePortfolioPosition(asset: string | undefined) {
	const { user } = useAuth();
	const userId = user?.id ?? "anonymous";
	const active = Boolean(user?.id && asset);
	const query = useQuery({
		queryKey: accountQueryKeys.portfolioPosition(userId, asset ?? "unknown"),
		queryFn: () => api.getPortfolioPosition(asset ?? ""),
		enabled: active,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});

	return {
		detail: query.data ?? null,
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}

export function usePortfolioPositionEvents(
	asset: string | undefined,
	page: number,
	limit = 20,
) {
	const { user } = useAuth();
	const userId = user?.id ?? "anonymous";
	const active = Boolean(user?.id && asset);
	const query = useQuery({
		queryKey: accountQueryKeys.portfolioPositionEvents(
			userId,
			asset ?? "unknown",
			page,
		),
		queryFn: () => api.getPortfolioPositionEvents(asset ?? "", page, limit),
		enabled: active,
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	return {
		events: query.data ?? null,
		loading: active && query.isPending,
		fetching: query.isFetching,
		error: query.data === undefined ? query.error : null,
	};
}
