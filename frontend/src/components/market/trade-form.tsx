import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { DecimalInput } from "../ui/decimal-input";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AssetIcon } from "../icons/asset-icon";
import { TradeFormSkeleton } from "./skeletons";
import { cn } from "@/lib/utils";
import type { UserBalance } from "@/types";
import { formatPrice, formatQty } from "@/utils/format";
import { PercentageSlider } from "../ui/slider";

interface TradeFormProps {
	symbol: string;
	lastPrice?: string | null;
	bestBid?: string | null;
	bestAsk?: string | null;
	onOrderPlaced?: () => void;
}

const SLIDER_PERCENTS = [0, 25, 50, 75, 100];

function toPrecision(value: string, precision: number): string {
	const num = Number(value);
	if (!Number.isFinite(num) || num < 0) return value;
	const factor = 10 ** precision;
	return String(Math.trunc(num * factor) / factor);
}

function isValidPositive(n: number): boolean {
	return Number.isFinite(n) && n > 0;
}

export function TradeForm({ symbol, lastPrice, bestBid, bestAsk, onOrderPlaced }: TradeFormProps) {
	const [side, setSide] = useState<"BUY" | "SELL">("BUY");
	const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
	const [price, setPrice] = useState("");
	const [quantity, setQuantity] = useState("");
	const [percent, setPercent] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const { authenticated, loading } = useAuth();
	const market = useMarket(symbol);
	const [balance, setBalance] = useState<UserBalance>({});
	const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

	const base = market?.baseAsset ?? symbol.split("_")[0] ?? symbol;
	const quote = market?.quoteAsset ?? symbol.split("_")[1] ?? "USD";
	const pricePrecision = market?.pricePrecision ?? 2;
	const qtyPrecision = market?.qtyPrecision ?? 4;
	const priceStep = 1 / 10 ** pricePrecision;
	const qtyStep = 1 / 10 ** qtyPrecision;

	const availableQuote = authenticated ? Number(balance[quote]?.available ?? 0) : 0;
	const availableBase = authenticated ? Number(balance[base]?.available ?? 0) : 0;

	const effectivePrice = orderType === "LIMIT" ? Number(price) : Number(lastPrice);

	useEffect(() => {
		if (authenticated) {
			api
				.getBalance()
				.then(setBalance)
				.catch((err) => {
					console.error("Failed to fetch balance:", err);
					toast.error("Failed to fetch balance");
				});
		}
	}, [authenticated, balanceRefreshKey]);

	useEffect(() => {
		setPrice(formatPrice(lastPrice ?? "", pricePrecision));
		setQuantity("");
		setPercent(0);
	}, [symbol, lastPrice]);

	const maxAffordableQty = useMemo(() => {
		if (!authenticated) return 0;
		if (side === "SELL") return availableBase;
		if (!isValidPositive(effectivePrice)) return 0;
		return availableQuote / effectivePrice;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authenticated, side, availableBase, availableQuote, effectivePrice]);

	const handleSetPrice = (p: string) => {
		setPrice(toPrecision(p, pricePrecision));
	};

	const handleSetQuantity = (q: string) => {
		setQuantity(toPrecision(q, qtyPrecision));
		if (Number(q) > 0) {
			setPercent(0);
		}
	};

	const applySliderPercent = (pct: number) => {
		if (!authenticated) return;
		let qty = 0;
		if (side === "BUY" && orderType === "LIMIT" && !isValidPositive(effectivePrice)) {
			toast.error("Enter a price first to use the slider");
			return;
		}
		qty = maxAffordableQty * (pct / 100);
		setPercent(pct);
		setQuantity(toPrecision(String(qty), qtyPrecision));
	};

	const isPriceOutOfBalance = useMemo(() => {
		if (!authenticated) return false;
		const q = Number(quantity);
		if (!Number.isFinite(q) || q <= 0) return false;
		const total = side === "BUY" ? effectivePrice * q : q;
		if (side === "BUY" && !isValidPositive(effectivePrice)) return false;
		const available = side === "BUY" ? availableQuote : availableBase;
		return total > available;
	}, [authenticated, orderType, effectivePrice, quantity, side, availableQuote, availableBase]);

	if (loading) {
		return <TradeFormSkeleton />;
	}

	const handlePlaceOrder = async (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!quantity || Number(quantity) <= 0) {
			toast.error("Enter a valid quantity");
			return;
		}

		if (orderType === "LIMIT" && (!price || !effectivePrice)) {
			toast.error("Enter a valid price for limit orders");
			return;
		}

		if (isPriceOutOfBalance) {
			toast.error(`Insufficient ${side === "BUY" ? quote : base} balance for this order`);
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

			const statusMsg =
				result.status === "FILLED"
					? `Filled at avg. ${result.averagePrice ?? "—"}`
					: result.status === "PARTIALLY_FILLED"
						? `Partially filled (${result.filledQty}/${Number(quantity)})`
						: "Order placed successfully";

			toast.success(statusMsg);
			setPrice("");
			setQuantity("");
			setPercent(0);
			setBalanceRefreshKey((k) => k + 1);
			onOrderPlaced?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Order failed");
		} finally {
			setSubmitting(false);
		}
	};

	const marketPriceText =
		lastPrice != null && Number(lastPrice) > 0
			? Number(lastPrice).toLocaleString(undefined, {
					minimumFractionDigits: pricePrecision,
					maximumFractionDigits: pricePrecision,
				})
			: "—";

	const pricePlaceholder = orderType === "MARKET" ? marketPriceText : "0";

	const estTotal =
		orderType === "LIMIT"
			? effectivePrice * (parseFloat(quantity) || 0)
			: isValidPositive(effectivePrice)
				? effectivePrice * (parseFloat(quantity) || 0)
				: 0;

	const estTotalText = authenticated
		? estTotal > 0
			? estTotal.toLocaleString(undefined, {
					minimumFractionDigits: pricePrecision,
					maximumFractionDigits: pricePrecision,
				})
			: "0"
		: "—";

	const displayBalance =
		side === "BUY"
			? formatPrice(availableQuote, pricePrecision)
			: formatQty(availableBase, qtyPrecision);
	const balanceAsset = side === "BUY" ? quote : base;

	return (
		<div className="flex flex-col select-none w-full">
			<div className="p-3">
				<div className="flex flex-col gap-3">
					<div className="bg-muted/40 relative flex h-12 w-full overflow-hidden rounded-xl">
						<div
							className="absolute top-0 h-full w-1/2 rounded-xl transition-all duration-100 ease-in-out"
							style={{
								backgroundColor: side === "BUY" ? "var(--green-bg)" : "var(--red-bg)",
								left: side === "BUY" ? "0" : "50%",
							}}
						/>
						<button
							type="button"
							onClick={() => {
								setSide("BUY");
								setPercent(0);
								setQuantity("");
							}}
							className={`relative z-10 w-full rounded-xl text-sm font-semibold transition-colors duration-100 cursor-pointer ${
								side === "BUY" ? "text-green-text" : "text-low-emphasis hover:text-green-text"
							}`}
						>
							Buy
						</button>
						<button
							type="button"
							onClick={() => {
								setSide("SELL");
								setPercent(0);
								setQuantity("");
							}}
							className={`relative z-10 w-full rounded-xl text-sm font-semibold transition-colors duration-100 cursor-pointer ${
								side === "SELL" ? "text-red-text" : "text-low-emphasis hover:text-red-text"
							}`}
						>
							Sell
						</button>
					</div>

					<div className="flex items-center justify-start flex-row gap-1">
						<button
							type="button"
							onClick={() => setOrderType("LIMIT")}
							className={`flex justify-center flex-col cursor-pointer rounded-lg py-1 whitespace-nowrap text-[13px] font-semibold px-3 h-8 transition-colors ${
								orderType === "LIMIT"
									? "text-high-emphasis bg-l3"
									: "text-medium-emphasis hover:text-high-emphasis"
							}`}
						>
							Limit
						</button>
						<button
							type="button"
							onClick={() => setOrderType("MARKET")}
							className={`flex justify-center flex-col cursor-pointer rounded-lg py-1 whitespace-nowrap text-[13px] font-semibold px-3 h-8 transition-colors ${
								orderType === "MARKET"
									? "text-high-emphasis bg-l3"
									: "text-medium-emphasis hover:text-high-emphasis"
							}`}
						>
							Market
						</button>
					</div>

					<form onSubmit={handlePlaceOrder} className="flex flex-col gap-3">
						<div className="flex justify-between flex-row">
							<span className="text-medium-emphasis text-xs">Available</span>
							<span className="text-high-emphasis text-xs font-medium">
								{authenticated ? `${displayBalance} ${balanceAsset}` : "-"}
							</span>
						</div>

						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between flex-row">
								<p className="text-medium-emphasis text-xs">Price</p>
							</div>
							<DecimalInput
								value={price}
								onChange={handleSetPrice}
								precision={pricePrecision}
								min={priceStep}
								step={priceStep}
								placeholder={pricePlaceholder}
								asset={quote}
								disabled={orderType === "MARKET"}
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between flex-row">
								<p className="text-medium-emphasis text-xs">Quantity</p>
							</div>
							<DecimalInput
								value={quantity}
								onChange={handleSetQuantity}
								precision={qtyPrecision}
								min={qtyStep}
								step={qtyStep}
								placeholder="0"
								asset={base}
							/>
						</div>

						<div className="flex flex-col gap-2 mt-4">
							<PercentageSlider disabled={!authenticated} />
						</div>

						<div className="flex flex-col gap-1.5">
							<p className="text-medium-emphasis text-xs">Est. Value</p>
							<div className="relative">
								<input
									type="text"
									placeholder="0"
									value={estTotalText}
									disabled
									className="bg-l3 border-border/60 placeholder-medium-emphasis disabled:opacity-60 border-1.5 w-full rounded-lg border-solid pr-12 text-left ring-0 transition text-lg tabular-nums text-high-emphasis outline-none h-11 px-3"
								/>
								<div className="flex flex-row pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 p-2">
									<div
										className="relative flex-none overflow-hidden rounded-full"
										style={{ width: 24, height: 24 }}
									>
										<AssetIcon asset={quote} className="size-6 object-contain" />
									</div>
								</div>
							</div>
						</div>

						{isPriceOutOfBalance && (
							<p className="text-xs text-red-text">
								Insufficient {balanceAsset} balance for this order
							</p>
						)}

						{authenticated ? (
							<div className="flex flex-col gap-2 pt-1">
								<Button
									type="submit"
									variant="inverted"
									disabled={submitting || isPriceOutOfBalance}
								>
									{submitting ? "Placing..." : side === "BUY" ? `Buy ${base}` : `Sell ${base}`}
								</Button>
							</div>
						) : (
							<div className="flex flex-col gap-2 pt-4">
								<Link to="/signup">
									<Button size="lg" variant="inverted" className="w-full">
										Sign up to trade
									</Button>
								</Link>
								<Link to="/login">
									<Button size="lg" variant="secondary" className="w-full">
										Log in to trade
									</Button>
								</Link>
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	);
}
