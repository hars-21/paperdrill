import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";

export function AuthLayout() {
	return (
		<div className="min-h-screen bg-background font-sans antialiased">
			<Navbar />
			<main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
				<div className="w-full max-w-sm">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
