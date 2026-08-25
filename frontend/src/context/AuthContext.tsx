import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, isUnauthorized } from "@/lib/api";

type User = {
	id: string;
	email: string;
	name: string;
};

type AuthContext = {
	user: User | null;
	loading: boolean;
	authenticated: boolean;
	refreshUser: () => Promise<void>;
	setUser: (user: User | null) => void;
};

export const AuthContext = createContext<AuthContext | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const refreshUser = useCallback(async () => {
		try {
			const user = await api.getCurrentUser();
			setUser(user);
		} catch (err) {
			if (isUnauthorized(err)) {
				setUser(null);
				return;
			}

			console.error("Failed to fetch current user:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refreshUser();
	}, [refreshUser]);

	return (
		<AuthContext.Provider value={{ user, loading, authenticated: !!user, refreshUser, setUser }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
};
