import type { UserBalance } from "@/types";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type User = {
	id: string;
	email: string;
	name: string;
	balance: UserBalance;
} | null;

type AuthContext = {
	user: User;
	setUser: (user: User) => void;
	loading: boolean;
	refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContext | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User>(null);
	const [loading, setLoading] = useState(true);
	const userRef = useRef<User>(null);
	const inflightRef = useRef<Promise<void> | null>(null);

	const refreshUser = useCallback(async () => {
		if (inflightRef.current) return inflightRef.current;

		const promise = (async () => {
			try {
				const data = await api.getMe();
				const u = {
					id: data.userId,
					email: data.email,
					name: data.name,
					balance: data.balance,
				};
				userRef.current = u;
				setUser(u);
			} catch (err) {
				console.error("Failed to refresh user:", err);
				userRef.current = null;
				setUser(null);
			}
		})();

		inflightRef.current = promise;
		try {
			await promise;
		} finally {
			inflightRef.current = null;
		}
	}, []);

	useEffect(() => {
		refreshUser().finally(() => setLoading(false));
	}, [refreshUser]);

	const setUserAndCache = useCallback((u: User) => {
		userRef.current = u;
		setUser(u);
	}, []);

	return (
		<AuthContext.Provider value={{ user, setUser: setUserAndCache, loading, refreshUser }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be inside AuthProvider");
	return context;
};
