import iconDark from "./brand/icon-dark.svg";
import icon from "./brand/icon.svg";
import logoDark from "./brand/logo-dark.png";
import logo from "./brand/logo.png";
import bannerDark from "./brand/banner-dark.png";
import banner from "./brand/banner.png";

import btcLogo from "./crypto/btc.svg";
import ethLogo from "./crypto/eth.svg";
import solLogo from "./crypto/sol.svg";
import usdLogo from "./crypto/usd.svg";

import balanceScreenshot from "./screenshots/balance.png";
import marketDataScreenshot from "./screenshots/market-data.png";
import tradingScreenshot from "./screenshots/trading.png";

export type Theme = "light" | "dark";

export const brand = {
	icon: {
		dark: iconDark,
		light: icon,
	},
	logo: {
		dark: logoDark,
		light: logo,
	},
	banner: {
		dark: bannerDark,
		light: banner,
	},
} as const;

export const crypto = {
	BTC: btcLogo,
	ETH: ethLogo,
	SOL: solLogo,
	USD: usdLogo,
} as const;

export const screenshots = {
	balance: balanceScreenshot,
	marketData: marketDataScreenshot,
	trading: tradingScreenshot,
} as const;

export function brandLogo(theme: Theme): string {
	return brand.logo[theme];
}

export function brandIcon(theme: Theme): string {
	return brand.icon[theme];
}

export function brandBanner(theme: Theme): string {
	return brand.banner[theme];
}
