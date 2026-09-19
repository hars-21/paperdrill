import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnalytics } from "@/lib/analytics";
import { api, isUnauthorized } from "@/lib/api";
import { accountQueryKeys, invalidateAccountQueries } from "@/lib/query-client";
import { toast } from "sonner";

type User = {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
};

type AuthContext = {
	user: User | null;
	loading: boolean;
	authenticated: boolean;
	verified: boolean;
	refreshUser: () => Promise<void>;
	setUser: (user: User | null) => void;
};

export const AuthContext = createContext<AuthContext | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const queryClient = useQueryClient();
	const posthog = useAnalytics();
	const previousUserId = useRef<string | null>(null);
	const setCurrentUser = useCallback(
		(nextUser: User | null) => {
			setUser(nextUser);
			if (nextUser) {
				posthog.identify(nextUser.id, { email_verified: nextUser.emailVerified });
			} else {
				posthog.reset();
			}
		},
		[posthog],
	);
	const dailyCredit = useMutation({
		mutationFn: (_userId: string) => api.claimDailyCredit(),
		onSuccess: async (credit, userId) => {
			if (credit.credited) {
				posthog.capture("daily_credit_claimed", { asset: credit.asset, amount: credit.amount });
				toast.success(`Daily credit: +${credit.amount} ${credit.asset}`);
			}
			await invalidateAccountQueries(queryClient, userId);
		},
		onError: (error) => console.warn("Daily credit could not be claimed:", error),
	});

	const refreshUser = useCallback(async () => {
		try {
			const user = await api.getCurrentUser();
			setCurrentUser(user);
		} catch (err) {
			if (isUnauthorized(err)) {
				setCurrentUser(null);
				return;
			}

			console.error("Failed to fetch current user:", err);
		} finally {
			setLoading(false);
		}
	}, [setCurrentUser]);

	useEffect(() => {
		refreshUser();
	}, [refreshUser]);

	useEffect(() => {
		const previous = previousUserId.current;
		if (previous && previous !== user?.id) {
			queryClient.removeQueries({ queryKey: accountQueryKeys.all(previous) });
		}
		previousUserId.current = user?.id ?? null;
	}, [queryClient, user?.id]);

	useEffect(() => {
		if (!user?.emailVerified) return;
		dailyCredit.mutate(user.id);
	}, [user?.id, user?.emailVerified]);

	return (
		<AuthContext.Provider value={{ user, loading, authenticated: !!user, verified: !!user?.emailVerified, refreshUser, setUser: setCurrentUser }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
};
