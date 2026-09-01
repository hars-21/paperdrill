import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { MobileDisclaimer } from "./mobile-disclaimer";
import { SeoHead } from "@/components/seo-head";
import { AuthProvider } from "@/context/AuthContext";
import { MarketProvider } from "@/context/MarketContext";

export function AppLayout() {
	return (
		<AuthProvider>
			<MarketProvider>
				<AppShell />
			</MarketProvider>
		</AuthProvider>
	);
}

function AppShell() {
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
