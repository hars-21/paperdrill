const ASSET_COLORS: Record<string, string> = {
	BTC: "#F7931A",
	ETH: "#3C3C3D",
	SOL: "#9945FF",
	USD: "#009393",
};

export function getAssetColor(asset: string) {
	const symbol = asset.trim().toUpperCase();
	const knownColor = ASSET_COLORS[symbol];
	if (knownColor) return knownColor;
}
