import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { accountQueryKeys } from "@/lib/query-client";

type UseBalanceOptions = {
	asset?: string;
	enabled?: boolean;
};

export function useBalance({ asset, enabled = true }: UseBalanceOptions = {}) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.balances(user?.id ?? "anonymous", asset),
		queryFn: () => api.getBalance(asset),
		enabled: active,
		refetchInterval: 15_000,
	});

	return {
		balances: query.data ?? {},
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}
