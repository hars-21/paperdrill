export const SITE = {
	name: "PaperDrill",
	tagline: "Competitive Trading Platform",
	url: "https://paperdrill.dev",
	description:
		"PaperDrill is a competitive trading platform where traders use credits, trade through a live matching engine, connect bots via API, and climb the leaderboard.",
	shortDescription:
		"Trade with credits through a live matching engine, connect bots, and climb the leaderboard.",
	keywords: [
		"competitive trading",
		"virtual trading",
		"credit trading",
		"trading leaderboard",
		"matching engine",
		"order book",
		"algorithmic trading",
		"BTC virtual trading",
		"API trading",
		"WebSocket trading",
		"PaperDrill",
	],
	locale: "en_US",
	twitter: "@paperdrill",
	contact: "support@paperdrill.dev",
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
	"/leaderboard": {
		title: `Leaderboard | ${SITE.name}`,
		description:
			"View PaperDrill's global leaderboard, ranked by all-time portfolio return across live credit markets.",
		path: "/leaderboard",
	},
	"/login": {
		title: `Sign In | ${SITE.name}`,
		description: "Sign in to your PaperDrill account to trade and manage your credit balance.",
		path: "/login",
		noIndex: true,
	},
	"/signup": {
		title: `Sign Up | ${SITE.name}`,
		description: "Create a free PaperDrill account and start trading with credits.",
		path: "/signup",
	},
	"/home": {
		title: `Home | ${SITE.name}`,
		description: "Review your PaperDrill portfolio and recent trading activity.",
		path: "/home",
		noIndex: true,
	},
	"/portfolio": {
		title: `Portfolio | ${SITE.name}`,
		description: "Review your credit balance, asset positions, and portfolio performance.",
		path: "/portfolio",
		noIndex: true,
	},
	"/activity": {
		title: `Orders & Trades | ${SITE.name}`,
		description: "Review your open orders, order history, and completed trades.",
		path: "/activity",
		noIndex: true,
	},
	"/settings/profile": {
		title: `Profile | ${SITE.name}`,
		description: "Manage your PaperDrill account details and session.",
		path: "/settings/profile",
		noIndex: true,
	},
	"/settings/api-keys": {
		title: `API Keys | ${SITE.name}`,
		description: "Manage scoped API credentials for your trading bots and clients.",
		path: "/settings/api-keys",
		noIndex: true,
	},
};

export function resolvePageSeo(pathname: string): PageSeo {
	if (ROUTE_SEO[pathname]) return ROUTE_SEO[pathname];

	const tradeMatch = pathname.match(/^\/trade\/([A-Z_]+)$/);
	if (tradeMatch) {
		const symbol = tradeMatch[1]?.replace("_", "/") ?? "BTC/USD";
		return {
			title: `Trade ${symbol} | ${SITE.name}`,
			description: `Trade ${symbol} with credits through PaperDrill's live matching engine, order book depth, and WebSocket market data.`,
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
