import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { crypto } from "@/assets";

export const assetNames: Record<string, string> = {
	USD: "US Dollar",
	BTC: "Bitcoin",
	ETH: "Ethereum",
	SOL: "Solana",
};
export const assetIcons: Record<string, string> = {
	USD: crypto.USD,
	BTC: crypto.BTC,
	ETH: crypto.ETH,
	SOL: crypto.SOL,
};

export function AssetIcon({ asset, className }: { asset: string; className?: string }) {
	const src = assetIcons[asset];

	return (
		<Avatar className={className}>
			<AvatarImage src={src} alt={assetNames[asset]} />
			<AvatarFallback>{asset}</AvatarFallback>
		</Avatar>
	);
}
