import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import { Analytics } from "@vercel/analytics/react";

import { ThemeProvider } from "./lib/theme-provider";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

const elem = document.getElementById("root")!;
const app = (
	<StrictMode>
		<ErrorBoundary>
			<ThemeProvider>
				<BrowserRouter>
					<AuthProvider>
						<App />
						<Toaster />
					</AuthProvider>
				</BrowserRouter>
			</ThemeProvider>
		</ErrorBoundary>
		<Analytics />
	</StrictMode>
);

if (import.meta.hot) {
	const root = (import.meta.hot.data.root ??= createRoot(elem));
	root.render(app);
} else {
	createRoot(elem).render(app);
}
