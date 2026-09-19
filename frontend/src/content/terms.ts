import type { Block } from "./types";

export interface LegalContent {
	lastUpdated: string;
	sections: { title: string; blocks: Block[] }[];
}

export const terms: LegalContent = {
	lastUpdated: "2026-09-19",
	sections: [
		{
			title: "Agreement & Eligibility",
			blocks: [
				{
					type: "paragraph",
					text: "These Terms of Service govern your use of PaperDrill. By creating an account or using the platform, you agree to these terms and our Privacy Policy. You must be at least 13 years old and legally able to accept these terms; if your local law requires a higher minimum age, that higher age applies.",
				},
			],
		},
		{
			title: "Simulated Trading Only",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill is a paper-trading simulator, not a real exchange. All balances, credits, prices, orders, trades, profit and loss, and leaderboard results are simulated. No real funds or assets are deposited, held, transferred or withdrawn, and nothing on PaperDrill can be redeemed for money or other value.",
				},
			],
		},
		{
			title: "Accounts & API Keys",
			blocks: [
				{
					type: "paragraph",
					text: "You must provide accurate account information and are responsible for activity under your account. Keep your password and API keys confidential. API keys act with their assigned scopes, so revoke a key immediately if it may be compromised. You may not transfer, sell or share an account in a way that bypasses platform controls.",
				},
			],
		},
		{
			title: "Credits, Performance & Leaderboard",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill may provide simulated starting balances or recurring credits. They have no monetary value, and eligibility, amount or availability may change. Portfolio figures and leaderboard rankings are estimates based on simulated market data and may be delayed, incomplete or recalculated.",
				},
				{
					type: "paragraph",
					text: "Verified users who complete a trade may be included automatically on the public leaderboard. Your account name and simulated performance may be visible publicly as described in the Privacy Policy.",
				},
			],
		},
		{
			title: "API Use & Rate Limits",
			blocks: [
				{
					type: "paragraph",
					text: "You may use the documented REST API and WebSocket feeds for your own applications and trading bots. You must follow the documentation, API key scopes and published rate limits. We may throttle or block traffic that threatens reliability, security or fair access. Contact [support@paperdrill.dev](mailto:support@paperdrill.dev) before relying on higher limits.",
				},
			],
		},
		{
			title: "Acceptable Use",
			blocks: [
				{
					type: "list",
					items: [
						"Do not disrupt, overload, probe or attempt to bypass the platform's security, authentication or rate limits.",
						"Do not access another user's account or data, scrape personal information or expose credentials.",
						"Do not use PaperDrill for unlawful, fraudulent or abusive activity, or misrepresent simulated results as real trading performance.",
						"Do not copy, resell or commercially exploit the service except with our written permission.",
					],
				},
			],
		},
		{
			title: "Not Financial Advice",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill is not an exchange, broker, custodian or financial adviser. Its market data and results are simulated and provided for educational and testing purposes only. Nothing on the platform is financial advice, a recommendation, or an offer to buy or sell a real asset. Do not use simulated results as the sole basis for real financial decisions.",
				},
			],
		},
		{
			title: "Availability & Changes",
			blocks: [
				{
					type: "paragraph",
					text: "We may change, suspend or discontinue features, markets, credits, limits or access to PaperDrill. The service may be unavailable or lose simulated state because of maintenance, failures or other events. We do not promise continuous availability, preservation of simulated data or any service level.",
				},
			],
		},
		{
			title: "Intellectual Property",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill and its software, design, branding and content are protected by applicable intellectual-property laws. These terms give you only a limited, revocable, non-exclusive right to use the service as provided.",
				},
			],
		},
		{
			title: "Suspension & Termination",
			blocks: [
				{
					type: "paragraph",
					text: "We may restrict or terminate access if you violate these terms, create security or operational risk, or use the platform unlawfully. You may stop using PaperDrill at any time and may request account deletion by contacting support.",
				},
			],
		},
		{
			title: "Disclaimers & Liability",
			blocks: [
				{
					type: "paragraph",
					text: "To the maximum extent permitted by law, PaperDrill is provided “as is” and “as available,” without warranties of accuracy, reliability, fitness for a particular purpose or non-infringement. PaperDrill is not responsible for real-world decisions made using simulated data.",
				},
				{
					type: "paragraph",
					text: "To the maximum extent permitted by law, PaperDrill will not be liable for indirect, incidental, special, consequential or punitive damages, or for loss of data, opportunity, profits or goodwill arising from use of the service. Nothing in these terms excludes liability that applicable law does not allow us to exclude.",
				},
			],
		},
		{
			title: "Changes to These Terms",
			blocks: [
				{
					type: "paragraph",
					text: "We may update these terms as PaperDrill changes. The date above shows the latest revision. If a change is material, we will provide notice through the service when appropriate. Continued use after the updated terms take effect means you accept them.",
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
