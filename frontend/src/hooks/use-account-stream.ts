import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatAccountSnapshot, type RawAccountSnapshot } from "@/lib/account-snapshot";
import { accountQueryKeys } from "@/lib/query-client";
import { wsManager } from "@/lib/ws";

function isAccountSnapshot(value: unknown): value is RawAccountSnapshot {
	if (!value || typeof value !== "object") return false;

	const snapshot = value as Partial<RawAccountSnapshot>;
	return (
		typeof snapshot.userId === "string" &&
		typeof snapshot.quoteAsset === "string" &&
		typeof snapshot.equity === "string" &&
		Array.isArray(snapshot.positions)
	);
}

/**
 * Subscribes the authenticated user to their private account channel and folds
 * live worker snapshots into the portfolio query cache. The stream is the
 * primary update path; queries still fetch on mount as a cold-start fallback.
 */
export function useAccountStream() {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const userId = user?.id ?? null;

	useEffect(() => {
		if (!userId) {
			wsManager.setTicketProvider(null);
			return;
		}

		wsManager.setTicketProvider(async () => {
			const ticket = await api.getWebSocketTicket();
			return ticket.ticket;
		});

		const unsubscribe = wsManager.subscribe(`account:${userId}`, (message) => {
			if (!isAccountSnapshot(message) || message.userId !== userId) return;

			queryClient.setQueryData(
				accountQueryKeys.portfolio(userId),
				formatAccountSnapshot(message),
			);

			void queryClient.invalidateQueries({
				queryKey: accountQueryKeys.balancesPrefix(userId),
			});
			void queryClient.invalidateQueries({
				queryKey: accountQueryKeys.portfolioAnalytics(userId),
			});
			void queryClient.invalidateQueries({
				queryKey: accountQueryKeys.portfolioPositionPrefix(userId),
			});
		});

		return () => {
			unsubscribe();
			wsManager.setTicketProvider(null);
		};
	}, [queryClient, userId]);
}
