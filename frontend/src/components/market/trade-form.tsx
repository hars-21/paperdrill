import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { UserBalance } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPrice, formatQty } from "@/utils/format";
import { Button } from "../ui/button";
import { DecimalInput } from "../ui/decimal-input";
import { PercentageSlider } from "../ui/slider";
import { TradeFormSkeleton } from "./skeletons";
import { Separator } from "../ui/separator";

interface TradeFormProps {
	symbol: string;
	loading?: boolean;
	lastPrice?: string | null;
	bestBid?: string | null;
	bestAsk?: string | null;
	onOrderPlaced?: () => void;
}

function isPositive(value: number) {
	return Number.isFinite(value) && value > 0;
}

function truncate(value: number, precision: number) {
	const factor = 10 ** precision;
	return String(Math.floor(value * factor + Number.EPSILON) / factor);
}

function editablePrice(value: number, precision: number) {
	return Number.isFinite(value) && value > 0 ? value.toFixed(precision) : "";
}

export function TradeForm({
	symbol,
	loading,
	lastPrice,
	bestBid,
	bestAsk,
	onOrderPlaced,
}: TradeFormProps) {
	const [side, setSide] = useState<"BUY" | "SELL">("BUY");
	const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
	const [price, setPrice] = useState("");
	const [quantity, setQuantity] = useState("");
	const [percent, setPercent] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [balance, setBalance] = useState<UserBalance>({});
	const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
	const { authenticated, verified, loading: authLoading } = useAuth();
	const canTrade = authenticated && verified;
	const market = useMarket(symbol);

	const base = market?.baseAsset ?? symbol.split("_")[0] ?? symbol;
	const quote = market?.quoteAsset ?? symbol.split("_")[1] ?? "USD";
	const pricePrecision = market?.pricePrecision ?? 2;
	const qtyPrecision = market?.qtyPrecision ?? 4;
	const priceStep = 10 ** -pricePrecision;
	const qtyStep = 10 ** -qtyPrecision;
	const availableQuote = canTrade ? Number(balance[quote]?.available ?? 0) : 0;
	const availableBase = canTrade ? Number(balance[base]?.available ?? 0) : 0;
	const effectivePrice = orderType === "LIMIT" ? Number(price) : Number(lastPrice);

	const midPrice = useMemo(() => {
		const bid = Number(bestBid);
		const ask = Number(bestAsk);
		return isPositive(bid) && isPositive(ask) ? (bid + ask) / 2 : Number(lastPrice);
	}, [bestBid, bestAsk, lastPrice]);

	const bboPrice = side === "BUY" ? Number(bestAsk) : Number(bestBid);

	const maxQuantity = useMemo(() => {
		if (!canTrade) return 0;
		if (side === "SELL") return availableBase;
		if (!isPositive(effectivePrice)) return 0;
		return availableQuote / effectivePrice;
	}, [canTrade, side, availableBase, availableQuote, effectivePrice]);
	const maximumQuantityValue = truncate(maxQuantity, qtyPrecision);
	const maximumQuantityText = formatQty(maximumQuantityValue, qtyPrecision);

	const requestedQuantity = Number(quantity);
	const exceedsMaximum =
		canTrade &&
		isPositive(requestedQuantity) &&
		requestedQuantity > maxQuantity + Number.EPSILON;
	const maximumMessage =
		side === "BUY"
			? `You can buy a maximum of ${maximumQuantityText} ${base} with your available ${quote}.`
			: `You can sell a maximum of ${maximumQuantityText} ${base}.`;
	const sliderDisabled =
		!canTrade ||
		orderType === "MARKET" ||
		maxQuantity <= 0 ||
		(side === "BUY" && !isPositive(effectivePrice));

	useEffect(() => {
		if (!canTrade) {
			setBalance({});
			return;
		}
		api
			.getBalance()
			.then(setBalance)
			.catch((error) => {
				console.error("Failed to fetch balance:", error);
				toast.error("Failed to fetch balance");
			});
	}, [canTrade, balanceRefreshKey]);

	useEffect(() => {
		setPrice(formatPrice(lastPrice ?? "", pricePrecision));
		setQuantity("");
		setPercent(0);
	}, [symbol, loading]);

	const setTradeSide = (nextSide: "BUY" | "SELL") => {
		setSide(nextSide);
		setQuantity("");
		setPercent(0);
	};

	const setTradeOrderType = (nextType: "LIMIT" | "MARKET") => {
		setOrderType(nextType);
		setQuantity("");
		setPercent(0);
	};

	const handleQuantityChange = (value: string) => {
		setQuantity(value);
		const nextQuantity = Number(value);
		if (!isPositive(nextQuantity) || !isPositive(maxQuantity)) {
			setPercent(0);
			return;
		}
		setPercent(Math.min(100, (nextQuantity / maxQuantity) * 100));
	};

	const applySliderPercent = (value: number) => {
		if (sliderDisabled) return;
		setPercent(value);
		setQuantity(value === 0 ? "" : truncate(maxQuantity * (value / 100), qtyPrecision));
	};

	const applyMaximum = () => {
		if (!isPositive(maxQuantity)) return;
		setQuantity(maximumQuantityValue);
		setPercent(100);
	};

	const handlePlaceOrder = async (event: React.SubmitEvent) => {
		event.preventDefault();
		if (!isPositive(Number(quantity))) {
			toast.error("Enter a valid quantity");
			return;
		}
		if (orderType === "LIMIT" && !isPositive(Number(price))) {
			toast.error("Enter a valid price for the limit order");
			return;
		}
		if (exceedsMaximum) {
			toast.error(maximumMessage);
			return;
		}

		setSubmitting(true);
		try {
			const result = await api.createOrder(
				side,
				orderType,
				symbol,
				quantity,
				orderType === "LIMIT" ? price : null,
			);

			const statusMessage =
				result.status === "FILLED"
					? `Filled at avg. ${result.averagePrice ?? "—"}`
					: result.status === "PARTIALLY_FILLED"
						? `Partially filled (${result.filledQty}/${Number(quantity)})`
						: "Order placed successfully";

			toast.success(statusMessage);
			setQuantity("");
			setPercent(0);
			setBalanceRefreshKey((key) => key + 1);
			onOrderPlaced?.();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Order failed");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading || authLoading) {
		return <TradeFormSkeleton showSecondaryAction={!authenticated} />;
	}

	const estimatedValue =
		isPositive(effectivePrice) && isPositive(requestedQuantity)
			? effectivePrice * requestedQuantity
			: 0;
	const displayBalance =
		side === "BUY"
			? formatPrice(availableQuote, pricePrecision)
			: formatQty(availableBase, qtyPrecision);
	const balanceAsset = side === "BUY" ? quote : base;
	const showMaximum =
		canTrade && isPositive(maxQuantity) && (side === "SELL" || orderType === "LIMIT");

	return (
		<div className="w-full select-none p-3">
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={() => setTradeSide("BUY")}
					className={cn(
						"h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors",
						side === "BUY"
							? "bg-green-bg/50 text-green-text"
							: "bg-muted/40 text-low-emphasis hover:bg-green-bg/50 hover:text-green-text",
					)}
				>
					Buy
				</button>
				<button
					type="button"
					onClick={() => setTradeSide("SELL")}
					className={cn(
						"h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors",
						side === "SELL"
							? "bg-red-bg/50 text-red-text"
							: "bg-muted/40 text-low-emphasis hover:bg-red-bg/50 hover:text-red-text",
					)}
				>
					Sell
				</button>
			</div>

			<div className="mt-4 flex items-center gap-1">
				{(["LIMIT", "MARKET"] as const).map((type) => (
					<button
						key={type}
						type="button"
						onClick={() => setTradeOrderType(type)}
						className={cn(
							"flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold transition-colors",
							orderType === type
								? "bg-muted text-high-emphasis"
								: "text-medium-emphasis hover:text-high-emphasis",
						)}
					>
						{type === "LIMIT" ? "Limit" : "Market"}
					</button>
				))}
			</div>

			<form onSubmit={handlePlaceOrder} className="mt-3 flex flex-col gap-3">
				<div className="flex items-center justify-between text-xs">
					<span className="text-medium-emphasis">Balance</span>
					<span className="font-medium text-high-emphasis">
						{canTrade ? `${displayBalance} ${balanceAsset}` : "—"}
					</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<label className="text-xs text-medium-emphasis">Price</label>
						<div className="flex items-center gap-2">
							<button
								type="button"
								disabled={orderType === "MARKET" || !isPositive(midPrice)}
								onClick={() => setPrice(editablePrice(midPrice, pricePrecision))}
								className="text-xs font-medium text-chart-5 hover:text-chart-5/80 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
								title={isPositive(midPrice) ? formatPrice(midPrice, pricePrecision) : undefined}
							>
								Mid
							</button>
							<Separator orientation="vertical" className="h-4!" />
							<button
								type="button"
								disabled={orderType === "MARKET" || !isPositive(bboPrice)}
								onClick={() => setPrice(editablePrice(bboPrice, pricePrecision))}
								className="text-xs font-medium text-chart-5 hover:text-chart-5/80 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
								title={isPositive(bboPrice) ? formatPrice(bboPrice, pricePrecision) : undefined}
							>
								BBO
							</button>
						</div>
					</div>
					<DecimalInput
						value={orderType === "MARKET" ? "Market price" : price}
						onChange={setPrice}
						precision={pricePrecision}
						min={priceStep}
						step={priceStep}
						placeholder={orderType === "MARKET" ? "Market price" : "0"}
						asset={quote}
						disabled={orderType === "MARKET"}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between gap-3">
						<label className="text-xs text-medium-emphasis">Quantity</label>
						{showMaximum && (
							<button
								type="button"
								onClick={applyMaximum}
								className="truncate text-xs font-medium text-chart-5 hover:text-chart-5/80"
							>
								Max {maximumQuantityText} {base}
							</button>
						)}
					</div>
					<DecimalInput
						value={quantity}
						onChange={handleQuantityChange}
						precision={qtyPrecision}
						min={qtyStep}
						step={qtyStep}
						placeholder="0"
						asset={base}
						aria-invalid={exceedsMaximum}
					/>
				</div>

				<PercentageSlider value={percent} onChange={applySliderPercent} disabled={sliderDisabled} />

				<div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
					<span className="text-medium-emphasis">Estimated value</span>
					<span className="font-medium text-high-emphasis">
						{formatPrice(estimatedValue, pricePrecision)} {quote}
					</span>
				</div>

				{exceedsMaximum && (
					<p className="text-xs leading-relaxed text-red-text">{maximumMessage}</p>
				)}

				{canTrade ? (
					<Button
						type="submit"
						variant="inverted"
						size="lg"
						className="w-full mt-2"
						disabled={submitting || exceedsMaximum}
					>
						{submitting ? "Placing…" : side === "BUY" ? `Buy ${base}` : `Sell ${base}`}
					</Button>
				) : authenticated ? (
					<Button asChild variant="inverted" size="lg" className="mt-2">
						<Link to="/verify-email">Verify email to trade</Link>
					</Button>
				) : (
					<div className="flex flex-col gap-3 mt-2">
						<Button asChild variant="inverted" size="lg">
							<Link to="/signup">Sign up to trade</Link>
						</Button>
						<Button asChild variant="secondary" size="lg">
							<Link to="/login">Sign in to trade</Link>
						</Button>
					</div>
				)}
			</form>
		</div>
	);
}
