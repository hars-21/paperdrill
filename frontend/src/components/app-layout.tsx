import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { SeoHead } from "@/components/seo-head";
import { SkipLink } from "@/components/ui/skip-link";

export function AppLayout() {
	return (
		<div className="flex min-h-dvh max-h-dvh flex-col overflow-hidden bg-l0 font-sans antialiased">
			<SeoHead />
			<SkipLink />
			<Navbar />
			<main
				id="main-content"
				className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-l0 text-high-emphasis"
			>
				<Outlet />
			</main>
		</div>
	);
}
