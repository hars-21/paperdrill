export interface ChangelogEntry {
	version: string;
	date: string;
	features: string[];
	fixes: string[];
	updates: string[];
}

export interface Changelog {
	intro: string;
	entries: ChangelogEntry[];
}

export const changelog: Changelog = {
	intro: "Release notes for PaperDrill. New features, fixes and updates land here.",
	entries: [
		{
			version: "0.3.0-beta",
			date: "2026-09-02",
			features: [
				"A new account dashboard for balances, trading activity, profile details and API-key management.",
				"Developer documentation covering authentication, orders, markets, trades, order books and WebSocket feeds.",
				"A rebuilt trading workspace with professional chart controls, depth view, market information and a compact watchlist.",
				"Improved order entry with BBO and mid-price shortcuts, maximum-quantity guidance and clearer market-order behavior.",
			],
			fixes: [
				"Improved signup and email verification so unverified users keep their session and can resend expired codes safely.",
				"Fixed chart colors across theme changes and prevented the trade form from overlapping the order book on mobile screens.",
				"Aligned loading states and responsive layouts across trading, markets, dashboard and documentation pages.",
			],
			updates: [
				"Expanded account data tables with trade history, market filters and stable sortable columns.",
				"New accounts now start with a focused USD balance instead of preloaded balances for every asset.",
			],
		},
		{
			version: "0.2.0-beta",
			date: "2026-08-27",
			features: [
				"Live 24h ticker stats for every market - last price, open, high, low, volume and 24h change.",
				"Real-time ticker updates over WebSocket on the markets and trade pages.",
				"Price and quote-volume display fixes in the market header.",
			],
			fixes: [
				"Fixed an infinite WebSocket resubscribe loop on the markets page.",
				"Fixed change and 24h volume calculations in the ticker.",
			],
			updates: [],
		},
		{
			version: "0.1.0-beta",
			date: "2026-08-12",
			features: [
				"Paper trading on BTC/USD, ETH/USD and SOL/USD spot markets.",
				"Live matching engine with price-time priority order matching.",
				"Real-time order book and trade feeds over WebSocket.",
				"Persistent sandbox accounts with simulated balances and full order history.",
				"Zero-fee trading across all markets.",
			],
			fixes: [],
			updates: [],
		},
	],
};
