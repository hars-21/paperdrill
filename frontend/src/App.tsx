import "./index.css";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/landing";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import { VerifyEmailPage } from "./pages/verify-email";
import { ProfilePage } from "./pages/profile";
import { TradePage } from "./pages/trade";
import { MarketsPage } from "./pages/markets";
import { DocsPage } from "./pages/docs";
import { ChangelogPage } from "./pages/changelog";
import { TermsPage } from "./pages/terms";
import { PrivacyPage } from "./pages/privacy";
import { AppLayout } from "./components/app-layout";
import { RootLayout } from "./components/root-layout";
import { Protected, PublicOnly } from "./components/route-guards";
import { DashboardLayout } from "./components/dashboard-layout";
import { DashboardOverviewPage } from "./pages/dashboard/overview";
import { DashboardApiKeysPage } from "./pages/dashboard/api-keys";
import { DashboardBalancesPage } from "./pages/dashboard/balances";
import { DashboardDataPage } from "./pages/dashboard/data";

function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4 text-center px-4">
			<h1 className="text-6xl font-bold text-medium-emphasis">404</h1>
			<p className="text-lg text-medium-emphasis">This page doesn't exist on PaperDrill yet.</p>
			<Link to="/" className="text-primary hover:underline text-sm">
				Go home
			</Link>
		</div>
	);
}

export function App() {
	return (
		<Routes>
			<Route element={<RootLayout />}>
				<Route index element={<LandingPage />} />
				<Route path="docs" element={<DocsPage />} />
				<Route path="changelog" element={<ChangelogPage />} />
				<Route path="terms" element={<TermsPage />} />
				<Route path="privacy" element={<PrivacyPage />} />
			</Route>

			<Route element={<AppLayout />}>
				<Route
					path="dashboard"
					element={
						<Protected>
							<DashboardLayout />
						</Protected>
					}
				>
					<Route index element={<DashboardOverviewPage />} />
					<Route path="api-keys" element={<DashboardApiKeysPage />} />
					<Route path="balances" element={<DashboardBalancesPage />} />
					<Route path="data" element={<DashboardDataPage />} />
					<Route path="profile" element={<ProfilePage />} />
				</Route>
				<Route path="profile" element={<Navigate to="/dashboard/profile" replace />} />
				<Route path="markets" element={<MarketsPage />} />
				<Route path="trade/:symbol" element={<TradePage />} />
				<Route
					path="login"
					element={
						<PublicOnly>
							<LoginPage />
						</PublicOnly>
					}
				/>
				<Route
					path="signup"
					element={
						<PublicOnly>
							<SignupPage />
						</PublicOnly>
					}
				/>
				<Route path="verify-email" element={<VerifyEmailPage />} />
				<Route path="*" element={<NotFound />} />
			</Route>
		</Routes>
	);
}
