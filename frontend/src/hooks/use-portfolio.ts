import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { accountQueryKeys } from "@/lib/query-client";

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
		refetchInterval: 15_000,
	});

	return {
		portfolio: query.data ?? null,
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}
