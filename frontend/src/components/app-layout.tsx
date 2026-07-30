import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { MobileDisclaimer } from "./mobile-disclaimer";

export function AppLayout() {
	return (
		<div className="min-h-dvh max-h-dvh flex flex-col bg-l0 font-sans antialiased overflow-x-hidden overflow-y-hidden">
			<Navbar />
			<main className="bg-l0 text-high-emphasis flex flex-1 flex-col justify-between overflow-x-hidden overflow-y-auto">
				<MobileDisclaimer />
				<Outlet />
			</main>
		</div>
	);
}
