import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { accountQueryKeys, invalidateTradingQueries } from "@/lib/query-client";
import type { CreateOrderInput } from "@/types";

type QueryOptions = {
	enabled?: boolean;
};

type OrderHistoryParams = {
	symbol?: string;
	status?: string;
	limit?: number;
	page?: number;
};

export function useOpenOrders({ enabled = true }: QueryOptions = {}) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.openOrders(user?.id ?? "anonymous"),
		queryFn: api.getOpenOrders,
		enabled: active,
		refetchInterval: 10_000,
	});

	return {
		openOrders: query.data ?? [],
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
	};
}

export function useOrderHistory(
	params: OrderHistoryParams = {},
	{ enabled = true }: QueryOptions = {},
) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.orders(user?.id ?? "anonymous", params),
		queryFn: () => api.getOrders(params),
		enabled: active,
		refetchInterval: 15_000,
	});

	return {
		orders: query.data ?? [],
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
	};
}

export function useTradeHistory(limit = 100, { enabled = true }: QueryOptions = {}) {
	const { user } = useAuth();
	const active = enabled && Boolean(user?.id);
	const query = useQuery({
		queryKey: accountQueryKeys.trades(user?.id ?? "anonymous", limit),
		queryFn: () => api.getTradeHistory(limit),
		enabled: active,
		refetchInterval: 15_000,
	});

	return {
		trades: query.data ?? [],
		loading: active && query.isPending,
		error: query.data === undefined ? query.error : null,
	};
}

export function useCreateOrder() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateOrderInput) =>
			api.createOrder(input.side, input.type, input.symbol, input.qty, input.price),
		onSuccess: async () => {
			if (user) await invalidateTradingQueries(queryClient, user.id);
		},
	});
}

export function useCancelOrder() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.cancelOrder,
		onSuccess: async () => {
			if (user) await invalidateTradingQueries(queryClient, user.id);
		},
	});
}
