export type NavigationId =
	| "home"
	| "portfolio"
	| "activity"
	| "profile"
	| "markets"
	| "trading"
	| "leaderboard"
	| "docs"
	| "api-keys";

export type NavigationItem = {
	id: NavigationId;
	label: string;
	href: string;
	activePath?: string;
	end?: boolean;
	external?: boolean;
};

export const primaryNavigation = [
	{ id: "trading", label: "Trade", href: "/trade/BTC_USD", activePath: "/trade" },
	{ id: "markets", label: "Markets", href: "/markets", end: true },
	{ id: "leaderboard", label: "Leaderboard", href: "/leaderboard", end: true },
	{ id: "docs", label: "Docs", href: "https://docs.paperdrill.dev", external: true },
] satisfies NavigationItem[];

export const accountNavigation = [
	{ id: "home", label: "Home", href: "/home", end: true },
	{ id: "portfolio", label: "Portfolio", href: "/portfolio", end: true },
	{ id: "activity", label: "Orders & trades", href: "/activity", end: true },
	{ id: "api-keys", label: "API keys", href: "/settings/api-keys", end: true },
	{ id: "profile", label: "Profile", href: "/settings/profile", end: true },
] satisfies NavigationItem[];
