import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { MobileDisclaimer } from "./mobile-disclaimer";
import { SeoHead } from "@/components/seo-head";
import { AuthProvider, useAuth } from "@/context/AuthContext";

export function AppLayout() {
	return (
		<AuthProvider>
			<AppShell />
		</AuthProvider>
	);
}

function AppShell() {
	const { user, refreshUser } = useAuth();

	useEffect(() => {
		if (!user) refreshUser();
	}, [user, refreshUser]);

	return (
		<div className="min-h-dvh max-h-dvh flex flex-col bg-l0 font-sans antialiased overflow-x-hidden overflow-y-hidden">
			<SeoHead />
			<Navbar />
			<main className="bg-l0 text-high-emphasis flex flex-1 flex-col justify-between overflow-x-hidden overflow-y-auto">
				<MobileDisclaimer />
				<Outlet />
			</main>
		</div>
	);
}
