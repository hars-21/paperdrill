import { Outlet } from "react-router-dom";
import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import { SeoHead } from "@/components/seo-head";
import { SkipLink } from "@/components/ui/skip-link";

export function RootLayout() {
	return (
		<div className="flex min-h-dvh flex-col overflow-x-hidden bg-background font-sans antialiased">
			<SeoHead />
			<SkipLink />
			<Navbar />
			<main id="main-content" className="flex flex-1 flex-col">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
