import { crypto } from "@/assets";

export const ASSET_NAMES: Record<string, string> = {
	USD: "US Dollar",
	BTC: "Bitcoin",
	ETH: "Ethereum",
	SOL: "Solana",
};

export const COIN_LOGOS: Record<string, string> = {
	USD: crypto.USD,
	BTC: crypto.BTC,
	ETH: crypto.ETH,
	SOL: crypto.SOL,
};
