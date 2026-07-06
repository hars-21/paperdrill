import { Navbar } from "./navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background font-sans antialiased">
			<Navbar />
			<main>{children}</main>
		</div>
	);
}
