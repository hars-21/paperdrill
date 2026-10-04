export type NavigationId =
	| "markets"
	| "trading"
	| "leaderboard"
	| "docs"
	| "dashboard"
	| "overview"
	| "api-keys"
	| "balances"
	| "account-data";

export type NavigationItem = {
	id: NavigationId;
	label: string;
	href: string;
	end?: boolean;
};

export const primaryNavigation = [
	{ id: "markets", label: "Markets", href: "/markets" },
	{ id: "trading", label: "Trading", href: "/trade/BTC_USD" },
	{ id: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
	{ id: "docs", label: "Docs", href: "/docs" },
] satisfies NavigationItem[];

export const applicationNavigation = [
	...primaryNavigation,
	{ id: "dashboard", label: "Dashboard", href: "/dashboard" },
] satisfies NavigationItem[];

export const dashboardNavigation = [
	{ id: "overview", label: "Overview", href: "/dashboard", end: true },
	{ id: "api-keys", label: "API keys", href: "/dashboard/api-keys" },
	{ id: "balances", label: "Balances", href: "/dashboard/balances" },
	{ id: "account-data", label: "Account data", href: "/dashboard/data" },
] satisfies NavigationItem[];

export const dashboardUtilityNavigation = [
	{ id: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
	{ id: "trading", label: "Open trading", href: "/trade/BTC_USD" },
	{ id: "docs", label: "Documentation", href: "/docs" },
] satisfies NavigationItem[];

export const dashboardPageNames: Record<string, string> = {
	...Object.fromEntries(dashboardNavigation.map((item) => [item.href, item.label])),
	"/dashboard/profile": "Profile",
};
