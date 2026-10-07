export const SITE = {
	name: "PaperDrill",
	tagline: "Competitive Trading Platform",
	url: "https://paperdrill.dev",
	description:
		"PaperDrill is a competitive trading platform where traders trade credit markets, connect bots through the API, and climb the global leaderboard.",
	shortDescription:
		"Trade credit markets through a live matching engine, connect bots, and earn your rank.",
	locale: "en_US",
	contact: "support@paperdrill.dev",
	securityContact: "security@paperdrill.dev",
	github: "https://github.com/hars-21/paperdrill",
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
		description: "Rules and terms for using the PaperDrill competitive trading platform.",
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
			"Explore live BTC/USD, ETH/USD, and SOL/USD credit markets with real-time charts and order books.",
		path: "/markets",
	},
	"/leaderboard": {
		title: `Leaderboard | ${SITE.name}`,
		description:
			"See the PaperDrill global trading leaderboard, ranked by portfolio return across live credit markets.",
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
		description:
			"Join PaperDrill, trade live credit markets, and build your place on the leaderboard.",
		path: "/signup",
	},
	"/verify-email": {
		title: `Verify Email | ${SITE.name}`,
		description: "Verify your email address to finish setting up your PaperDrill account.",
		path: "/verify-email",
		noIndex: true,
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
		const symbol = tradeMatch[1]?.replaceAll("_", "/") ?? "BTC/USD";
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

export function jsonLdWebPage(title: string, description: string, url: string): object {
	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${url}#webpage`,
		url,
		name: title,
		description,
		inLanguage: "en",
		isPartOf: { "@id": `${SITE.url}/#website` },
	};
}

export function jsonLdWebSite(): object {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE.url}/#website`,
		name: SITE.name,
		url: SITE.url,
		description: SITE.description,
		inLanguage: "en",
		publisher: { "@id": `${SITE.url}/#organization` },
	};
}

export function jsonLdOrganization(): object {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${SITE.url}/#organization`,
		name: SITE.name,
		url: SITE.url,
		logo: {
			"@type": "ImageObject",
			url: `${SITE.url}/apple-touch-icon.png`,
			width: 180,
			height: 180,
		},
		description: SITE.description,
		sameAs: [SITE.github],
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
		"@type": "WebApplication",
		"@id": `${SITE.url}/#application`,
		name: SITE.name,
		applicationCategory: "FinanceApplication",
		applicationSubCategory: "Competitive trading",
		operatingSystem: "Web",
		url: SITE.url,
		description: SITE.description,
		isAccessibleForFree: true,
		browserRequirements: "Requires a modern web browser with JavaScript enabled.",
		featureList: [
			"Competitive credit markets",
			"Global trading leaderboard",
			"Live order books and matching engine",
			"REST API and WebSocket market data",
			"API keys for trading bots",
		],
		provider: { "@id": `${SITE.url}/#organization` },
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
	};
}
