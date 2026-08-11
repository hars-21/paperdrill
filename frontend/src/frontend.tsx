import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/error-boundary";

import { ThemeProvider } from "./lib/theme-provider";
import { Toaster } from "./components/ui/sonner";

const elem = document.getElementById("root")!;
const app = (
	<StrictMode>
		<ErrorBoundary>
			<ThemeProvider>
				<BrowserRouter>
					<App />
					<Toaster />
				</BrowserRouter>
			</ThemeProvider>
		</ErrorBoundary>
	</StrictMode>
);

if (import.meta.hot) {
	const root = (import.meta.hot.data.root ??= createRoot(elem));
	root.render(app);
} else {
	createRoot(elem).render(app);
}
