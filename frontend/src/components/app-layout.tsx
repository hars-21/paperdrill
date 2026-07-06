import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";

export function AppLayout() {
	return (
		<div className="min-h-dvh max-h-dvh flex flex-col bg-background font-sans antialiased overflow-hidden">
			<Navbar />
			<main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
				<Outlet />
			</main>
		</div>
	);
}
