import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { accountQueryKeys } from "@/lib/query-client";
import type { BalanceHistoryRange } from "@/types";

type BalanceHistoryOptions = {
	asset?: string | null;
	reason?: string | null;
	page?: number;
	limit?: number;
	enabled?: boolean;
};

export function useBalanceHistory({
	asset,
	reason,
	page = 1,
	limit = 20,
	enabled = true,
}: BalanceHistoryOptions = {}) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const params = { asset: asset ?? null, reason: reason ?? null, page, limit };
	const query = useQuery({
		queryKey: accountQueryKeys.balanceHistory(user?.id ?? "anonymous", params),
		queryFn: () => api.getBalanceHistory(params),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	return {
		history: query.data ?? null,
		loading: active && query.isPending,
		fetching: query.isFetching,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}

type BalanceSeriesOptions = {
	asset?: string | null;
	range?: BalanceHistoryRange;
	enabled?: boolean;
};

export function useBalanceSeries({
	asset,
	range = "30d",
	enabled = true,
}: BalanceSeriesOptions = {}) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const params = { asset: asset ?? null, range };
	const query = useQuery({
		queryKey: accountQueryKeys.balanceSeries(user?.id ?? "anonymous", params),
		queryFn: () => api.getBalanceSeries(params),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	return {
		series: query.data ?? null,
		loading: active && query.isPending,
		fetching: query.isFetching,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}
