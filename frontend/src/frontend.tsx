import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ErrorBoundary } from "./components/error-boundary";

import { ThemeProvider } from "./lib/theme-provider";
import { queryClient } from "./lib/query-client";
import { Toaster } from "./components/ui/sonner";
import { PostHogProvider } from "@posthog/react";

const options = {
	api_host: process.env.BUN_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
	defaults: "2026-05-30",
} as const;

const analyticsEnabled = process.env.NODE_ENV === "production";

const elem = document.getElementById("root")!;
const content = (
	<ErrorBoundary>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<BrowserRouter>
					<App />
					<Toaster />
				</BrowserRouter>
			</ThemeProvider>
		</QueryClientProvider>
	</ErrorBoundary>
);

const app = <StrictMode>{analyticsEnabled ? (
	<PostHogProvider apiKey={process.env.BUN_PUBLIC_POSTHOG_PROJECT_TOKEN ?? ""} options={options}>
		{content}
	</PostHogProvider>
) : content}</StrictMode>;

if (import.meta.hot) {
	const root = (import.meta.hot.data.root ??= createRoot(elem));
	root.render(app);
} else {
	createRoot(elem).render(app);
}
