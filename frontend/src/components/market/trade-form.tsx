import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { COIN_LOGOS } from "@/utils/misc";
import { TradeFormSkeleton } from "./skeletons";

interface TradeFormProps {
	symbol: string;
	onOrderPlaced?: () => void;
}

export function TradeForm({ symbol, onOrderPlaced }: TradeFormProps) {
	const [side, setSide] = useState<"BUY" | "SELL">("BUY");
	const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
	const [price, setPrice] = useState("");
	const [quantity, setQuantity] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const { user, loading, refreshUser } = useAuth();

	if (loading) {
		return <TradeFormSkeleton />;
	}

	const [base, quote] = symbol.split("_") as [string, string];
	const baseLogo = COIN_LOGOS[base];
	const quoteLogo = COIN_LOGOS[quote];

	const handlePlaceOrder = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!quantity || Number(quantity) <= 0) {
			toast.error("Enter a valid quantity");
			return;
		}
		if (orderType === "LIMIT" && (!price || Number(price) <= 0)) {
			toast.error("Enter a valid price for limit orders");
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

			await refreshUser();
			onOrderPlaced?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Order failed");
		} finally {
			setSubmitting(false);
		}
	};

	const estTotal =
		orderType === "LIMIT" ? (parseFloat(price) * parseFloat(quantity) || 0).toFixed(2) : "—";

	return (
		<div className="flex flex-col select-none">
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
							onClick={() => setSide("BUY")}
							className={`relative z-10 w-full rounded-xl text-sm font-semibold transition-colors duration-100 cursor-pointer ${
								side === "BUY" ? "text-green-text" : "text-low-emphasis hover:text-green-text"
							}`}
						>
							Buy
						</button>
						<button
							type="button"
							onClick={() => setSide("SELL")}
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
							<span className="text-medium-emphasis text-xs">Balance</span>
							<span className="text-high-emphasis text-xs font-medium">
								{side === "BUY"
									? `${user?.balance[quote]?.available ?? 0} ${quote}`
									: `${user?.balance[base]?.available ?? 0} ${base}`}
							</span>
						</div>

						{orderType === "LIMIT" && (
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between flex-row">
									<p className="text-medium-emphasis text-xs">Price</p>
								</div>
								<div className="relative">
									<input
										type="text"
										inputMode="numeric"
										step="0.1"
										placeholder="0"
										value={price}
										onChange={(e) => setPrice(e.target.value)}
										className="bg-l3 border-l3 placeholder-medium-emphasis focus:border-primary border-1.5 w-full rounded-lg pr-12 text-left ring-0 transition focus:ring-0 text-lg tabular-nums text-high-emphasis outline-none h-11 px-3"
									/>
									<div className="flex flex-row pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 p-2">
										<div
											className="relative flex-none overflow-hidden rounded-full"
											style={{ width: 24, height: 24 }}
										>
											{quoteLogo ? (
												<img src={quoteLogo} alt={quote} className="h-6 w-6 object-contain" />
											) : (
												<div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
													{quote[0]}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="flex flex-col gap-1.5">
							<p className="text-medium-emphasis text-xs">Quantity</p>
							<div className="relative">
								<input
									type="text"
									inputMode="numeric"
									step="0.00001"
									placeholder="0"
									value={quantity}
									onChange={(e) => setQuantity(e.target.value)}
									className="bg-l3 border-border/60 placeholder-medium-emphasis focus:border-primary border-1.5 w-full rounded-lg border-solid pr-12 text-left ring-0 transition focus:ring-0 text-lg tabular-nums text-high-emphasis outline-none h-11 px-3"
								/>
								<div className="flex flex-row pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 p-2">
									<div
										className="relative flex-none overflow-hidden rounded-full"
										style={{ width: 24, height: 24 }}
									>
										{baseLogo ? (
											<img src={baseLogo} alt={base} className="h-6 w-6 object-contain" />
										) : (
											<div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
												{base[0]}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{orderType === "LIMIT" && (
							<div className="flex flex-col gap-1.5">
								<p className="text-medium-emphasis text-xs">Order Value</p>
								<div className="relative">
									<input
										type="text"
										inputMode="numeric"
										placeholder="0"
										value={estTotal === "0.00" ? "" : estTotal}
										disabled
										className="bg-l3 border-border/60 placeholder-medium-emphasis disabled:opacity-60 border-1.5 w-full rounded-lg border-solid pr-12 text-left ring-0 transition text-lg tabular-nums text-high-emphasis outline-none h-11 px-3"
									/>
									<div className="flex flex-row pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 p-2">
										<div
											className="relative flex-none overflow-hidden rounded-full"
											style={{ width: 24, height: 24 }}
										>
											{quoteLogo ? (
												<img src={quoteLogo} alt={quote} className="h-6 w-6 object-contain" />
											) : (
												<div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
													{quote[0]}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						)}

						{user ? (
							<div className="flex flex-col gap-2 pt-1">
								<Button type="submit" variant="inverted" disabled={submitting}>
									{submitting
										? "Placing..."
										: side === "BUY"
											? "Place Buy Order"
											: "Place Sell Order"}
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
