import { Outlet } from "react-router-dom";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import { SeoHead } from "@/components/seo-head";

export function RootLayout() {
	return (
		<div className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans antialiased">
			<SeoHead />
			<Navbar />
			<main className="flex flex-col flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
