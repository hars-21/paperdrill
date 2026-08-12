import type { Block } from "./types";

export interface LegalContent {
	lastUpdated: string;
	sections: { title: string; blocks: Block[] }[];
}

export const privacy: LegalContent = {
	lastUpdated: "2026-08-12",
	sections: [
		{
			title: "What We Collect",
			blocks: [
				{
					type: "paragraph",
					text: "We collect only what's needed to run the sandbox: your name, email address and password (stored securely). We also store your simulated balances, orders and trades so your sandbox state persists between sessions.",
				},
			],
		},
		{
			title: "Cookies & Local Storage",
			blocks: [
				{
					type: "paragraph",
					text: "An authentication cookie keeps you signed in. Your theme and UI preferences are stored in your browser's local storage. We do not use tracking or advertising cookies.",
				},
			],
		},
		{
			title: "How We Use Your Data",
			blocks: [
				{
					type: "paragraph",
					text: "We use your data solely to provide and operate the PaperDrill service and keep your sandbox account working.",
				},
			],
		},
		{
			title: "Data Sharing",
			blocks: [
				{
					type: "paragraph",
					text: "We do not sell your personal data. We do not share it with third parties except where required by law or necessary to operate the service (such as hosting infrastructure).",
				},
			],
		},
		{
			title: "Your Rights",
			blocks: [
				{
					type: "paragraph",
					text: "You can request a copy of your data or ask us to delete your account and data at any time by emailing [support@paperdrill.dev](mailto:support@paperdrill.dev).",
				},
			],
		},
	],
};
