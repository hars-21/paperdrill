import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/loader";

export function Protected({ children }: { children: ReactNode }) {
	const { user, verified, loading } = useAuth();

	if (loading) return <Loader />;
	if (!user) return <Navigate to="/login" replace />;
	if (!verified) return <Navigate to="/verify-email" replace />;
	return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
	const { user, verified, loading } = useAuth();

	if (loading) return <Loader />;
	if (user) return <Navigate to={verified ? "/dashboard" : "/verify-email"} replace />;
	return <>{children}</>;
}
