import { Inbox, X } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import type { OrderRecord } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface OpenOrdersProps {
	loading?: boolean;
	refreshKey?: number;
}

export function OpenOrders({ loading, refreshKey }: OpenOrdersProps) {
	const [orders, setOrders] = useState<OrderRecord[]>([]);
	const [cancelling, setCancelling] = useState<string | null>(null);

	const fetchOpenOrders = async () => {
		try {
			const data = await api.getOpenOrders();
			setOrders(data);
		} catch {}
	};

	const handleCancel = async (orderId: string) => {
		setCancelling(orderId);
		try {
			await api.cancelOrder(orderId);
			toast.success("Order cancelled successfully");
			await fetchOpenOrders();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to cancel order");
		} finally {
			setCancelling(null);
		}
	};

	useEffect(() => {
		fetchOpenOrders();
	}, [refreshKey]);

	if (loading) {
		return (
			<div className="flex flex-col h-full select-none animate-pulse">
				<div className="flex items-center justify-between border-b border-border/40 px-5 py-3 bg-muted/15">
					<Skeleton className="h-4 w-28" />
				</div>
				<div className="overflow-auto flex-1 min-h-0">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b border-border/30 text-left text-muted-foreground bg-muted/5 font-mono">
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px]">
									Market
								</th>
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px]">
									Side
								</th>
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px]">
									Type
								</th>
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
									Price
								</th>
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
									Size
								</th>
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
									Filled
								</th>
								<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
									Action
								</th>
							</tr>
						</thead>
						<tbody>
							{Array.from({ length: 3 }).map((_, i) => (
								<tr key={i} className="border-b border-border/20">
									<td className="px-5 py-3">
										<Skeleton className="h-3.5 w-12" />
									</td>
									<td className="px-5 py-3">
										<Skeleton className="h-3.5 w-8" />
									</td>
									<td className="px-5 py-3">
										<Skeleton className="h-3.5 w-10" />
									</td>
									<td className="px-5 py-3 text-right">
										<Skeleton className="h-3.5 w-16 ml-auto" />
									</td>
									<td className="px-5 py-3 text-right">
										<Skeleton className="h-3.5 w-12 ml-auto" />
									</td>
									<td className="px-5 py-3 text-right">
										<Skeleton className="h-3.5 w-12 ml-auto" />
									</td>
									<td className="px-5 py-3 text-right">
										<Skeleton className="h-3.5 w-14 ml-auto" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full select-none">
			<div className="flex items-center justify-between border-b border-border/40 px-5 py-3 bg-muted/15">
				<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Open Orders
				</h2>
				{orders.length > 0 && (
					<span className="text-[10px] font-mono text-muted-foreground/60">
						{orders.length} order{orders.length !== 1 ? "s" : ""}
					</span>
				)}
			</div>

			<div className="overflow-auto flex-1 min-h-0">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b border-border/30 text-left text-muted-foreground bg-muted/5 font-mono">
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px]">
								Market
							</th>
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px]">
								Side
							</th>
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px]">
								Type
							</th>
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
								Price
							</th>
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
								Size
							</th>
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
								Filled
							</th>
							<th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">
								Action
							</th>
						</tr>
					</thead>
					<tbody>
						{orders?.length > 0 ? (
							orders.map((order) => (
								<tr
									key={order.orderId}
									className="border-b border-border/20 hover:bg-muted/10 transition-colors"
								>
									<td className="px-5 py-3 font-mono text-[11px]">
										{order.symbol.replace("_", "/")}
									</td>
									<td
										className={`px-5 py-3 font-mono text-[11px] font-medium ${
											order.side === "BUY" ? "text-success" : "text-destructive"
										}`}
									>
										{order.side}
									</td>
									<td className="px-5 py-3 font-mono text-[11px]">{order.type}</td>
									<td className="px-5 py-3 font-mono text-[11px] text-right">
										{order.price ?? "—"}
									</td>
									<td className="px-5 py-3 font-mono text-[11px] text-right">{order.qty}</td>
									<td className="px-5 py-3 font-mono text-[11px] text-right">
										{Number(order.filledQty) > 0 ? (
											<span className="text-orange-500">
												{((Number(order.filledQty) / Number(order.qty)) * 100).toFixed(1)}%
											</span>
										) : (
											<span className="text-muted-foreground">0%</span>
										)}
									</td>
									<td className="px-5 py-3 text-right">
										<button
											onClick={() => handleCancel(order.orderId)}
											disabled={cancelling === order.orderId}
											className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
										>
											<X className="h-3.5 w-3.5" />
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={7} className="px-5 py-10 text-center">
									<div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-2 py-4">
										<Inbox className="h-6 w-6 stroke-[1.5] text-muted-foreground/40" />
										<p className="text-xs font-medium">No open orders</p>
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
