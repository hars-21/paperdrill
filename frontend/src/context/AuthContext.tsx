import type { UserBalance } from "@/types";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

	const refreshUser = useCallback(async () => {
		try {
			const data = await api.getMe();
			setUser({
				id: data.userId,
				email: data.email,
				name: data.name,
				balance: data.balance,
			});
		} catch (err) {
			console.error("Failed to refresh user:", err);
			setUser(null);
		}
	}, []);

	useEffect(() => {
		setLoading(true);
		refreshUser().finally(() => setLoading(false));
	}, [refreshUser]);

	return (
		<AuthContext.Provider value={{ user, setUser, loading, refreshUser }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be inside AuthProvider");
	return context;
};
