import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import type { LeaderboardRange } from "@/types";

export const leaderboardQueryKeys = {
	all: ["leaderboard"] as const,
	page: (range: LeaderboardRange, page: number, limit: number) =>
		["leaderboard", "page", range, page, limit] as const,
	me: (range: LeaderboardRange) => ["leaderboard", "me", range] as const,
};

export function useLeaderboard(range: LeaderboardRange, page: number, limit = 25) {
	const query = useQuery({
		queryKey: leaderboardQueryKeys.page(range, page, limit),
		queryFn: () => api.getLeaderboard(range, limit, (page - 1) * limit),
		staleTime: 10_000,
		placeholderData: keepPreviousData,
	});

	return {
		leaderboard: query.data ?? null,
		loading: query.isPending,
		fetching: query.isFetching,
		error: query.data === undefined ? query.error : null,
		refresh: query.refetch,
	};
}

export function useMyLeaderboard(range: LeaderboardRange) {
	const { authenticated } = useAuth();
	const query = useQuery({
		queryKey: leaderboardQueryKeys.me(range),
		queryFn: () => api.getMyLeaderboardEntry(range),
		enabled: authenticated,
		staleTime: 15_000,
		placeholderData: keepPreviousData,
	});

	return {
		mine: query.data ?? null,
		loading: authenticated && query.isPending,
		error: query.data === undefined ? query.error : null,
	};
}

/**
 * The backend broadcasts a lightweight invalidation event whenever the live
 * projection changes. Refetch the visible leaderboard once the burst settles
 * instead of polling on a timer.
 */
export function useLeaderboardStream() {
	const queryClient = useQueryClient();

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | null = null;

		const unsubscribe = wsManager.subscribe("leaderboard", () => {
			if (timer) return;

			timer = setTimeout(() => {
				timer = null;
				void queryClient.invalidateQueries({ queryKey: leaderboardQueryKeys.all });
			}, 350);
		});

		return () => {
			unsubscribe();
			if (timer) clearTimeout(timer);
		};
	}, [queryClient]);
}
