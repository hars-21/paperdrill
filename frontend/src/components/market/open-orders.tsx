import { Inbox, X } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import type { OrderRecord } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { OpenOrderSkeleton } from "./skeletons";

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
		return <OpenOrderSkeleton />;
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
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Market</TableHead>
							<TableHead>Side</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="text-right">Price</TableHead>
							<TableHead className="text-right">Size</TableHead>
							<TableHead className="text-right">Filled</TableHead>
							<TableHead className="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orders?.length > 0 ? (
							orders.map((order) => (
								<TableRow key={order.orderId}>
									<TableCell>{order.symbol.replace("_", "/")}</TableCell>
									<TableCell className={order.side === "BUY" ? "text-success" : "text-destructive"}>
										{order.side}
									</TableCell>
									<TableCell>{order.type}</TableCell>
									<TableCell className="text-right">{order.price ?? "—"}</TableCell>
									<TableCell className="text-right">{order.qty}</TableCell>
									<TableCell className="text-right">
										{Number(order.filledQty) > 0 ? (
											<span className="text-orange-500">
												{((Number(order.filledQty) / Number(order.qty)) * 100).toFixed(1)}%
											</span>
										) : (
											<span className="text-muted-foreground">0%</span>
										)}
									</TableCell>
									<TableCell className="text-right">
										<Button
											onClick={() => handleCancel(order.orderId)}
											disabled={cancelling === order.orderId}
											variant="ghost"
											size="icon-sm"
											className="text-low-emphasis hover:text-destructive hover:bg-destructive/10"
										>
											<X className="size-3.5" />
										</Button>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="py-10 text-center font-sans">
									<div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-2 py-4">
										<Inbox className="size-6 stroke-[1.5] text-muted-foreground/40" />
										<p className="text-xs font-medium">No open orders</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
