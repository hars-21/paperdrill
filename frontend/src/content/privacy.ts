import type { Block } from "./types";

export interface LegalContent {
	lastUpdated: string;
	sections: { title: string; blocks: Block[] }[];
}

export const privacy: LegalContent = {
	lastUpdated: "2026-09-19",
	sections: [
		{
			title: "About This Policy",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill operates a simulated trading platform. This policy explains what personal information we collect, why we use it and the choices available to you. Questions can be sent to [support@paperdrill.dev](mailto:support@paperdrill.dev).",
				},
			],
		},
		{
			title: "Information We Collect",
			blocks: [
				{
					type: "list",
					items: [
						"Account information, including your name, email address, password hash, email-verification status and account timestamps.",
						"Simulated trading information, including balances, portfolio baseline, daily credits, orders, fills, trades and leaderboard statistics.",
						"API key information, including the key label, scopes, secret hash, creation time, last-used time and revocation status. The full secret is shown only when a key is created.",
						"Technical and usage information, such as IP address, browser and device details, page visits, clicks, product events, request metadata, logs and error diagnostics.",
						"Messages and other information you provide when contacting support.",
					],
				},
			],
		},
		{
			title: "Cookies, Browser Storage & Analytics",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill uses an essential HTTP-only cookie to keep you signed in. Interface preferences, such as theme and sidebar state, may be stored in local storage or a cookie.",
				},
				{
					type: "paragraph",
					text: "In production, we use PostHog for product analytics. It may use cookies or browser storage and collect page views, clicks, device information and the product events described above. We use this information to understand feature usage and improve the platform, not for third-party advertising.",
				},
			],
		},
		{
			title: "How We Use Information",
			blocks: [
				{
					type: "list",
					items: [
						"Provide accounts, authentication, API access and the simulated trading service.",
						"Persist simulated balances, orders, trades, credits and portfolio performance.",
						"Operate the public leaderboard for eligible verified users who have traded.",
						"Protect PaperDrill, enforce rate limits and investigate abuse or security incidents.",
						"Measure usage, diagnose errors, improve features and communicate service-related information.",
						"Comply with applicable law and respond to lawful requests.",
					],
				},
			],
		},
		{
			title: "Legal Bases",
			blocks: [
				{
					type: "paragraph",
					text: "Where data-protection law requires a legal basis, we process information as needed to provide the service you request, for our legitimate interests in securing and improving PaperDrill, with consent where required, and to meet legal obligations. You may withdraw consent for consent-based processing at any time.",
				},
			],
		},
		{
			title: "How We Share Information",
			blocks: [
				{
					type: "paragraph",
					text: "We do not sell personal information. We share it only with providers that help operate PaperDrill, such as infrastructure and database hosts, email delivery providers, PostHog for product analytics and Sentry for error monitoring; when required by law; or to protect the rights and safety of PaperDrill and its users.",
				},
				{
					type: "paragraph",
					text: "The public leaderboard displays an eligible user's chosen account name and simulated performance, including rank, equity and profit or loss. It does not display email addresses. Service providers may process information in countries outside your own under their applicable safeguards.",
				},
			],
		},
		{
			title: "Retention & Security",
			blocks: [
				{
					type: "paragraph",
					text: "We retain account and simulated trading information while your account is active and afterward only as reasonably needed to operate the service, prevent abuse, resolve disputes, maintain security or meet legal obligations. Retention periods depend on the type of record and why it is held. Deletion from backups and logs may take additional time.",
				},
				{
					type: "paragraph",
					text: "We use reasonable technical and organizational safeguards, including hashed passwords and API key secrets. No online service can guarantee absolute security, so keep your password and API keys confidential and revoke any key you believe has been exposed.",
				},
			],
		},
		{
			title: "Your Choices & Rights",
			blocks: [
				{
					type: "paragraph",
					text: "Depending on where you live, you may have rights to access, correct, delete, restrict or object to processing of your personal information, or request a portable copy. You may also complain to your local data-protection authority. To make a request, email [support@paperdrill.dev](mailto:support@paperdrill.dev). We may need to verify your identity before completing it.",
				},
			],
		},
		{
			title: "Automated Processing",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill automatically matches simulated orders, calculates portfolios and ranks eligible users on the leaderboard. These calculations affect only the simulated platform and do not produce legal or similarly significant real-world effects.",
				},
			],
		},
		{
			title: "Children & Policy Changes",
			blocks: [
				{
					type: "paragraph",
					text: "PaperDrill is not directed to children under 13, and we do not knowingly collect their personal information. We may update this policy as the platform or legal requirements change. The date above shows the latest revision; material changes will be communicated through the service when appropriate.",
				},
			],
		},
	],
};
