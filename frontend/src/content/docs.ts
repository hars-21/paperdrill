import type { Block } from "./types";

export interface DocsContent {
	intro: string;
	sections: { id: string; title: string; blocks: Block[] }[];
}

export const docs: DocsContent = {
	intro: "A quick guide to the PaperDrill sandbox - what it is and how to use it.",
	sections: [
		{
			id: "introduction",
			title: "Introduction",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill is a simulated exchange (sandbox) for paper trading digital assets. It runs a real matching engine with a live order book, so orders are matched exactly how they would be on a production exchange - but with simulated money and no real risk.",
				},
				{
					type: "paragraph",
					text: "Nothing on PaperDrill involves real funds. Balances, trades and market data are all simulated and hold no real value.",
				},
			],
		},
		{
			id: "markets",
			title: "Markets",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill currently offers spot trading on the following markets. All markets charge zero fees.",
				},
				{ type: "list", items: ["BTC/USD", "ETH/USD", "SOL/USD"] },
			],
		},
		{
			id: "trading",
			title: "Trading",
			blocks: [
				{
					type: "paragraph",
					text: "Place limit or market orders from the trading page. Orders are matched using price-time priority - better prices fill first, then earlier orders at the same price.",
				},
				{
					type: "paragraph",
					text: "The order book shows live bids and asks, and trades update in real time over a WebSocket feed.",
				},
			],
		},
		{
			id: "accounts",
			title: "Accounts & Balances",
			blocks: [
				{
					type: "paragraph",
					text: "Create a free account to get a pre-funded sandbox balance. Your balances and order history persist across sessions, so your portfolio is exactly where you left it when you come back.",
				},
			],
		},
		{
			id: "data",
			title: "Real-Time Data",
			blocks: [
				{
					type: "paragraph",
					text: "The order book, trade prints and chart data stream over WebSocket in real time, so you can observe how the market reacts to orders as they happen.",
				},
			],
		},
		{
			id: "support",
			title: "Support",
			blocks: [
				{
					type: "paragraph",
					text: "Questions or feedback? Reach us at [support@paperdrill.dev](mailto:support@paperdrill.dev).",
				},
			],
		},
	],
};
