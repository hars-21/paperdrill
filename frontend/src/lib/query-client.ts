import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 15_000,
			gcTime: 5 * 60_000,
			retry: 1,
			refetchOnWindowFocus: true,
		},
		mutations: {
			retry: false,
		},
	},
});

export const accountQueryKeys = {
	all: (userId: string) => ["account", userId],
	balances: (userId: string, asset?: string) => ["account", userId, "balances", asset ?? "all"],
	balancesPrefix: (userId: string) => ["account", userId, "balances"],
	portfolio: (userId: string) => ["account", userId, "portfolio"],
	openOrders: (userId: string) => ["account", userId, "open-orders"],
	ordersPrefix: (userId: string) => ["account", userId, "orders"],
	orders: (userId: string, params: Record<string, unknown>) => [
		"account",
		userId,
		"orders",
		params,
	],
	tradesPrefix: (userId: string) => ["account", userId, "trades"],
	trades: (userId: string, limit: number) => ["account", userId, "trades", { limit }],
};

export function invalidateAccountQueries(client: QueryClient, userId: string) {
	return Promise.all([
		client.invalidateQueries({ queryKey: accountQueryKeys.balancesPrefix(userId) }),
		client.invalidateQueries({ queryKey: accountQueryKeys.portfolio(userId) }),
	]);
}

export function invalidateTradingQueries(client: QueryClient, userId: string) {
	return Promise.all([
		client.invalidateQueries({ queryKey: accountQueryKeys.balancesPrefix(userId) }),
		client.invalidateQueries({ queryKey: accountQueryKeys.portfolio(userId) }),
		client.invalidateQueries({ queryKey: accountQueryKeys.openOrders(userId) }),
		client.invalidateQueries({ queryKey: accountQueryKeys.ordersPrefix(userId) }),
		client.invalidateQueries({ queryKey: accountQueryKeys.tradesPrefix(userId) }),
	]);
}
