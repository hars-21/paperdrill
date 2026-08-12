import { Outlet } from "react-router-dom";
import AnnouncementBar from "@/components/landing/announcement-bar";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import { SeoHead } from "@/components/seo-head";

export function RootLayout() {
	return (
		<div className="min-h-screen flex flex-col bg-background font-sans antialiased">
			<SeoHead />
			<AnnouncementBar />
			<Navbar />
			<main className="flex flex-col flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
