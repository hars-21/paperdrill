import "./index.css";
import { Routes, Route, Link } from "react-router-dom";
import { LandingPage } from "./pages/landing";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import { ProfilePage } from "./pages/profile";
import { TradePage } from "./pages/trade";
import { MarketsPage } from "./pages/markets";
import { AppLayout } from "./components/app-layout";
import { AuthLayout } from "./components/auth-layout";

function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
			<h1 className="text-6xl font-bold text-medium-emphasis">404</h1>
			<p className="text-lg text-medium-emphasis">Page not found</p>
			<Link to="/" className="text-primary hover:underline text-sm">
				Go home
			</Link>
		</div>
	);
}

export function App() {
	return (
		<Routes>
			<Route path="/">
				<Route index element={<LandingPage />} />
				<Route element={<AppLayout />}>
					<Route path="profile" element={<ProfilePage />} />
					<Route path="markets" element={<MarketsPage />} />
					<Route path="trade/:symbol" element={<TradePage />} />
					<Route path="*" element={<NotFound />} />
				</Route>
				<Route element={<AuthLayout />}>
					<Route path="login" element={<LoginPage />} />
					<Route path="signup" element={<SignupPage />} />
				</Route>
			</Route>
		</Routes>
	);
}
