import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/loader";
import { getSafeReturnTo } from "@/lib/redirect";

export function Protected({ children }: { children: ReactNode }) {
	const { authenticated, verified, needsOnboarding, loading } = useAuth();
	const location = useLocation();
	const returnTo = `${location.pathname}${location.search}${location.hash}`;

	if (loading) return <Loader />;
	if (!authenticated) return <Navigate to="/login" replace state={{ returnTo }} />;
	if (!verified) return <Navigate to="/verify-email" replace state={{ returnTo }} />;
	if (needsOnboarding) return <Navigate to="/onboarding" replace state={{ returnTo }} />;
	return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
	const { authenticated, verified, needsOnboarding, loading } = useAuth();
	const location = useLocation();
	const returnTo = getSafeReturnTo(location.state);

	if (loading) return <Loader />;
	if (authenticated) {
		if (!verified) return <Navigate to="/verify-email" replace state={{ returnTo }} />;
		if (needsOnboarding) return <Navigate to="/onboarding" replace state={{ returnTo }} />;
		return <Navigate to={returnTo} replace />;
	}
	return <>{children}</>;
}

export function OnboardingOnly({ children }: { children: ReactNode }) {
	const { authenticated, verified, needsOnboarding, loading } = useAuth();
	const location = useLocation();
	const returnTo = getSafeReturnTo(location.state);

	if (loading) return <Loader />;
	if (!authenticated) return <Navigate to="/login" replace state={{ returnTo }} />;
	if (!verified) return <Navigate to="/verify-email" replace state={{ returnTo }} />;
	if (!needsOnboarding) return <Navigate to={returnTo} replace />;
	return <>{children}</>;
}

