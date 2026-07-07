import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
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

	const handlePlaceOrder = async (e: React.SubmitEvent) => {
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

	const base = symbol.split("_")[0];

	return (
		<div className="flex h-full flex-col select-none">
			<Tabs
				value={side}
				onValueChange={(v) => setSide(v as "BUY" | "SELL")}
				className="flex flex-1 flex-col"
			>
				<div className="border-b border-border/40 p-4 bg-muted/15">
					<TabsList className="grid w-full grid-cols-2 p-1 bg-l2 border border-border/10">
						<TabsTrigger
							value="BUY"
							className="data-[state=active]:bg-success data-[state=active]:text-white text-xs font-semibold transition-all py-1.5 dark:data-[state=active]:bg-success"
						>
							Buy
						</TabsTrigger>
						<TabsTrigger
							value="SELL"
							className="data-[state=active]:bg-destructive data-[state=active]:text-white text-xs font-semibold transition-all py-1.5 dark:data-[state=active]:bg-destructive"
						>
							Sell
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value={side} className="flex-1 p-5 flex flex-col justify-between" forceMount>
					<form onSubmit={handlePlaceOrder} className="space-y-5 flex-1 flex flex-col">
						<div className="space-y-4">
							<div className="flex justify-between items-center text-xs">
								<span className="text-muted-foreground">Available Balance</span>
								<span className="font-mono text-high-emphasis font-semibold">
									{side === "BUY"
										? `${user?.balance.USD?.available ?? 0} USD`
										: `${user?.balance[base!]?.available ?? 0} ${base}`}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
								<button
									type="button"
									onClick={() => setOrderType("LIMIT")}
									className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
										orderType === "LIMIT"
											? "bg-card text-high-emphasis shadow-sm border border-border/10"
											: "text-muted-foreground hover:text-high-emphasis"
									}`}
								>
									Limit
								</button>
								<button
									type="button"
									onClick={() => setOrderType("MARKET")}
									className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
										orderType === "MARKET"
											? "bg-card text-high-emphasis shadow-sm border border-border/10"
											: "text-muted-foreground hover:text-high-emphasis"
									}`}
								>
									Market
								</button>
							</div>

							{orderType === "LIMIT" ? (
								<div className="space-y-1.5">
									<Label htmlFor="price" className="text-xs font-medium text-muted-foreground">
										Price
									</Label>
									<div className="relative">
										<Input
											id="price"
											type="number"
											step="0.01"
											min={0}
											value={price}
											onChange={(e) => setPrice(e.target.value)}
											placeholder="0.00"
											mono
											size="lg"
											className="pr-12"
										/>
										<div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/80 tracking-wider">
											USD
										</div>
									</div>
								</div>
							) : (
								<div className="space-y-1.5">
									<Label
										htmlFor="price-market"
										className="text-xs font-medium text-muted-foreground"
									>
										Price
									</Label>
									<div className="relative">
										<Input
											id="price-market"
											type="text"
											disabled
											value="Market Price"
											size="lg"
											className="font-sans bg-muted/40 border-dashed text-muted-foreground/80"
										/>
									</div>
								</div>
							)}

							<div className="space-y-1.5">
								<Label htmlFor="quantity" className="text-xs font-medium text-muted-foreground">
									Quantity
								</Label>
								<div className="relative">
									<Input
										id="quantity"
										type="number"
										step="0.01"
										min={0}
										value={quantity}
										onChange={(e) => setQuantity(e.target.value)}
										placeholder="0.00"
										mono
										size="lg"
										className="pr-12"
									/>
									<div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/80 tracking-wider">
										{base}
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-4 pt-4 border-t border-border/40">
							<div className="flex justify-between items-center text-xs">
								<span className="text-muted-foreground">Est. Total</span>
								<span className="font-mono font-bold text-high-emphasis">
									{(parseFloat(price) * parseFloat(quantity) || 0).toFixed(2)} USD
								</span>
							</div>

							<Button
								type="submit"
								disabled={submitting}
								variant={side === "BUY" ? "buy" : "sell"}
								className="h-10"
							>
								{submitting
									? "Placing..."
									: side === "BUY"
										? "Place Buy Order"
										: "Place Sell Order"}
							</Button>
						</div>
					</form>
				</TabsContent>
			</Tabs>
		</div>
	);
}
