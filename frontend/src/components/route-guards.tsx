import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/loader";

export function Protected({ children }: { children: ReactNode }) {
	const { authenticated, loading } = useAuth();

	if (loading) return <Loader />;
	if (!authenticated) return <Navigate to="/login" replace />;
	return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
	const { authenticated, loading } = useAuth();

	if (loading) return <Loader />;
	if (authenticated) return <Navigate to="/dashboard" replace />;
	return <>{children}</>;
}
