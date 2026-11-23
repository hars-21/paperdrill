import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAnalytics } from "@/lib/analytics";
import { api, isUnauthorized } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { accountQueryKeys } from "@/lib/query-client";
import type { UserData } from "@/types/api";

type AuthContextValue = {
	user: UserData | null;
	loading: boolean;
	authenticated: boolean;
	verified: boolean;
	needsOnboarding: boolean;
	refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [user, setUser] = useState<UserData | null>(null);
	const [profileLoading, setProfileLoading] = useState(false);
	const [profileResolved, setProfileResolved] = useState(false);
	const queryClient = useQueryClient();
	const posthog = useAnalytics();
	const previousUserId = useRef<string | null>(null);

	const refreshUser = useCallback(async () => {
		if (!session?.user) {
			setUser(null);
			setProfileResolved(true);
			return;
		}

		setProfileLoading(true);
		try {
			const data = await api.getMe();
			setUser(data);
		} catch (error) {
			if (isUnauthorized(error)) {
				setUser(null);
			}
		} finally {
			setProfileLoading(false);
			setProfileResolved(true);
		}
	}, [session?.user]);

	useEffect(() => {
		let cancelled = false;

		const sync = async () => {
			if (sessionPending) return;
			if (!session?.user) {
				if (!cancelled) {
					setUser(null);
					setProfileResolved(true);
				}
				return;
			}
			await refreshUser();
		};

		void sync();

		return () => {
			cancelled = true;
		};
	}, [refreshUser, session?.user, sessionPending]);

	useEffect(() => {
		const nextUserId = user?.id ?? null;

		if (nextUserId) {
			posthog.identify(nextUserId, {
				email: user?.email,
				emailVerified: user?.emailVerified,
				username: user?.username ?? undefined,
			});
		} else if (previousUserId.current) {
			queryClient.removeQueries({ queryKey: accountQueryKeys.all(previousUserId.current) });
			posthog.reset();
		}

		previousUserId.current = nextUserId;
	}, [posthog, queryClient, user?.email, user?.emailVerified, user?.id, user?.username]);

	const loading = sessionPending || (Boolean(session?.user) && (!profileResolved || (profileLoading && !user)));

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				authenticated: Boolean(session?.user),
				verified: Boolean(user?.emailVerified ?? session?.user?.emailVerified),
				needsOnboarding: Boolean(user?.needsOnboarding),
				refreshUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
