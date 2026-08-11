import btcLogo from "@/assets/btc-logo.svg";
import ethLogo from "@/assets/eth-logo.svg";
import solLogo from "@/assets/sol-logo.svg";
import usdLogo from "@/assets/usd-logo.svg";

export const ASSET_NAMES: Record<string, string> = {
	USD: "US Dollar",
	BTC: "Bitcoin",
	ETH: "Ethereum",
	SOL: "Solana",
};

export const COIN_LOGOS: Record<string, string> = {
	USD: usdLogo,
	BTC: btcLogo,
	ETH: ethLogo,
	SOL: solLogo,
};

export interface MarketStat {
	price: string;
	change: string;
	isUp: boolean;
	volume: string;
}

export const MARKET_STATS: Record<string, MarketStat> = {
	BTC_USD: { price: "$65,425.50", change: "+2.45%", isUp: true, volume: "$452.8M" },
	ETH_USD: { price: "$3,412.20", change: "-1.80%", isUp: false, volume: "$284.1M" },
	SOL_USD: { price: "$142.10", change: "+5.12%", isUp: true, volume: "$95.4M" },
	USD_USD: { price: "$1.00", change: "0.00%", isUp: true, volume: "$0.0M" },
};
