import type { Block } from "./types";

export interface LegalContent {
	lastUpdated: string;
	sections: { title: string; blocks: Block[] }[];
}

export const terms: LegalContent = {
	lastUpdated: "2026-08-12",
	sections: [
		{
			title: "Simulated Environment",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill is a sandbox, not a real exchange. Every balance, price, order and trade on the platform is simulated. No real funds, assets, deposits or withdrawals are involved at any point, and nothing you do on PaperDrill has any real monetary value.",
				},
			],
		},
		{
			title: "Accounts",
			blocks: [
				{
					type: "paragraph",
					text: "Creating an account is free. You agree to provide accurate information and to keep your login details safe. Accounts receive a simulated starting balance used only for paper trading.",
				},
			],
		},
		{
			title: "Permitted Use",
			blocks: [
				{
					type: "paragraph",
					text: "You may use PaperDrill to learn how trading and matching engines work, to test strategies, and to explore the live order book. Do not attempt to disrupt the service, abuse the platform, or interfere with other users.",
				},
			],
		},
		{
			title: "Not Financial Advice",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill is not an exchange, broker, custodian or financial adviser. Prices and market data are simulated and provided for educational purposes only. Nothing on the platform constitutes financial advice or an offer to trade real assets.",
				},
			],
		},
		{
			title: "No Liability",
			blocks: [
				{
					type: "paragraph",
					text: "The service is provided as-is without warranties of any kind. Simulated losses have no real-world meaning, and PaperDrill is not responsible for any decisions you make based on simulated data.",
				},
			],
		},
		{
			title: "Contact",
			blocks: [
				{
					type: "paragraph",
					text: "Questions about these terms? Email us at [support@paperdrill.dev](mailto:support@paperdrill.dev).",
				},
			],
		},
	],
};
