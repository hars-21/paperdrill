import "./index.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/landing";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import { VerifyEmailPage } from "./pages/verify-email";
import { ProfilePage } from "./pages/profile";
import { TradePage } from "./pages/trade";
import { MarketsPage } from "./pages/markets";
import { TermsPage } from "./pages/terms";
import { PrivacyPage } from "./pages/privacy";
import { AppLayout } from "./components/app-layout";
import { RootLayout } from "./components/root-layout";
import { Protected, PublicOnly } from "./components/route-guards";
import { HomePage } from "./pages/home";
import { ApiKeysPage } from "./pages/api-keys";
import { PortfolioPage } from "./pages/portfolio";
import { ActivityPage } from "./pages/activity";
import { LeaderboardPage } from "./pages/leaderboard";
import { NotFoundPage } from "./pages/not-found";
import { RouteBehavior } from "./components/route-behavior";
import { getLastTradePath } from "./lib/ux-preferences";

function TradeRedirect() {
	return <Navigate to={getLastTradePath()} replace />;
}

export function App() {
	return (
		<>
			<RouteBehavior />
			<Routes>
				<Route element={<RootLayout />}>
					<Route index element={<LandingPage />} />
					<Route path="terms" element={<TermsPage />} />
					<Route path="privacy" element={<PrivacyPage />} />
				</Route>

				<Route element={<AppLayout />}>
					<Route
						path="home"
						element={
							<Protected>
								<HomePage />
							</Protected>
						}
					/>
					<Route
						path="portfolio"
						element={
							<Protected>
								<PortfolioPage />
							</Protected>
						}
					/>
					<Route
						path="activity"
						element={
							<Protected>
								<ActivityPage />
							</Protected>
						}
					/>
					<Route
						path="settings/profile"
						element={
							<Protected>
								<ProfilePage />
							</Protected>
						}
					/>
					<Route
						path="settings/api-keys"
						element={
							<Protected>
								<ApiKeysPage />
							</Protected>
						}
					/>
					<Route path="settings" element={<Navigate to="/settings/profile" replace />} />
					<Route path="profile" element={<Navigate to="/settings/profile" replace />} />
					<Route path="markets" element={<MarketsPage />} />
					<Route path="leaderboard" element={<LeaderboardPage />} />
					<Route path="trade" element={<TradeRedirect />} />
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
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</>
	);
}
