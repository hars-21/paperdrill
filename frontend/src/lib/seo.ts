export const SITE = {
	name: "PaperDrill",
	tagline: "The Exchange Built for Developers",
	url: "https://paperdrill.dev",
	description:
		"PaperDrill is a live paper-trading exchange with a real matching engine and order book. Trade on the UI or connect a bot via API — no KYC, no real money, no risk.",
	shortDescription:
		"Real matching engine. Real order book. Trade on the UI or connect a bot. Zero risk.",
	keywords: [
		"paper trading",
		"crypto exchange simulator",
		"matching engine",
		"order book",
		"developer exchange",
		"algorithmic trading sandbox",
		"BTC paper trading",
		"API trading",
		"WebSocket trading",
		"PaperDrill",
	],
	locale: "en_US",
	twitter: "@paperdrill",
	contact: "hello@paperdrill.dev",
	securityContact: "security@paperdrill.dev",
} as const;

export const OG_IMAGE = `${SITE.url}/og-image.png`;

export interface PageSeo {
	title: string;
	description?: string;
	path?: string;
	noIndex?: boolean;
}

export const DEFAULT_SEO: PageSeo = {
	title: `${SITE.name} - ${SITE.tagline}`,
	description: SITE.description,
	path: "/",
};

export const ROUTE_SEO: Record<string, PageSeo> = {
	"/": {
		title: `${SITE.name} - ${SITE.tagline}`,
		description: SITE.description,
		path: "/",
	},
	"/docs": {
		title: `Documentation | ${SITE.name}`,
		description:
			"Learn how PaperDrill works — markets, trading, REST API, WebSocket feeds, and paper-trading sandbox setup for developers.",
		path: "/docs",
	},
	"/changelog": {
		title: `Changelog | ${SITE.name}`,
		description: "Release notes and product updates for the PaperDrill paper-trading exchange.",
		path: "/changelog",
	},
	"/terms": {
		title: `Terms of Service | ${SITE.name}`,
		description: "Terms of service for using the PaperDrill simulated trading platform.",
		path: "/terms",
	},
	"/privacy": {
		title: `Privacy Policy | ${SITE.name}`,
		description: "How PaperDrill collects, uses, and protects your data.",
		path: "/privacy",
	},
	"/markets": {
		title: `Markets | ${SITE.name}`,
		description:
			"Browse live BTC/USD, ETH/USD, and SOL/USD spot markets on PaperDrill with real-time order books.",
		path: "/markets",
	},
	"/login": {
		title: `Sign In | ${SITE.name}`,
		description: "Sign in to your PaperDrill account to trade and manage simulated balances.",
		path: "/login",
		noIndex: true,
	},
	"/signup": {
		title: `Sign Up | ${SITE.name}`,
		description: "Create a free PaperDrill account and start paper trading with simulated funds.",
		path: "/signup",
	},
	"/profile": {
		title: `Profile | ${SITE.name}`,
		description: "View your PaperDrill account, balances, and trading history.",
		path: "/profile",
		noIndex: true,
	},
};

export function resolvePageSeo(pathname: string): PageSeo {
	if (ROUTE_SEO[pathname]) return ROUTE_SEO[pathname];
	if (pathname.startsWith("/docs/")) {
		const page = pathname.split("/").at(-1)?.replaceAll("-", " ") ?? "Documentation";
		return {
			title: `${page.replace(/^./, (letter) => letter.toUpperCase())} | ${SITE.name}`,
			description: "PaperDrill API documentation and developer guides.",
			path: pathname,
		};
	}

	if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
		const page =
			pathname.split("/").at(-1)?.replace("api-keys", "API Keys").replace("data", "Account Data") ??
			"Dashboard";
		const title =
			pathname === "/dashboard"
				? "Dashboard"
				: page.replace(/^./, (letter) => letter.toUpperCase());
		return {
			title: `${title} | ${SITE.name}`,
			description: "Manage your PaperDrill account, balances, API keys and trading activity.",
			path: pathname,
			noIndex: true,
		};
	}

	const tradeMatch = pathname.match(/^\/trade\/([A-Z_]+)$/);
	if (tradeMatch) {
		const symbol = tradeMatch[1]?.replace("_", "/") ?? "BTC/USD";
		return {
			title: `Trade ${symbol} | ${SITE.name}`,
			description: `Live ${symbol} paper trading on PaperDrill — real matching engine, order book depth, and WebSocket market data.`,
			path: pathname,
		};
	}

	return {
		title: `Page Not Found | ${SITE.name}`,
		description: SITE.description,
		path: pathname,
		noIndex: true,
	};
}

export function canonicalUrl(path = "/"): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return normalized === "/" ? SITE.url : `${SITE.url}${normalized}`;
}

export function jsonLdWebSite(): object {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE.name,
		url: SITE.url,
		description: SITE.description,
		potentialAction: {
			"@type": "SearchAction",
			target: `${SITE.url}/markets?q={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	};
}

export function jsonLdOrganization(): object {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: SITE.name,
		url: SITE.url,
		logo: `${SITE.url}/og-image.png`,
		description: SITE.description,
		contactPoint: {
			"@type": "ContactPoint",
			email: SITE.contact,
			contactType: "customer support",
		},
	};
}

export function jsonLdSoftwareApplication(): object {
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: SITE.name,
		applicationCategory: "FinanceApplication",
		operatingSystem: "Web",
		url: SITE.url,
		description: SITE.description,
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
	};
}
