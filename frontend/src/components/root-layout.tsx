import { Outlet } from "react-router-dom";
import AnnouncementBar from "@/components/landing/announcement-bar";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";

export function RootLayout() {
	return (
		<div className="min-h-screen flex flex-col bg-background font-sans antialiased">
			<AnnouncementBar />
			<Navbar />
			<main className="flex flex-col flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
