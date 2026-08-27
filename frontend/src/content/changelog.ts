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
