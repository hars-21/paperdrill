import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/loader";
import { ASSET_NAMES, COIN_LOGOS } from "@/utils/misc";
import type { OrderRecord } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ProfilePage() {
	const { user, setUser, loading, refreshUser } = useAuth();
	const [orders, setOrders] = useState<OrderRecord[]>([]);
	const [ordersLoading, setOrdersLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		refreshUser();
		api
			.getOpenOrders()
			.then((data) => setOrders(data))
			.catch(() => {})
			.finally(() => setOrdersLoading(false));
	}, []);

	if (loading) return <Loader />;
	if (!user) return <Navigate to="/" replace />;

	const handleLogout = () => {
		setUser(null);
		toast.success("Logged out successfully");
	};

	return (
		<AppLayout>
			<div className="mx-auto max-w-3xl px-6 py-10 select-none animate-fade-in">
				<div className="mb-8 flex items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Account Profile</h1>
						<p className="text-xs text-muted-foreground mt-1">
							Manage sandbox balances and review recent trade execution activity.
						</p>
					</div>
					<Button
						onClick={handleLogout}
						variant="outline"
						size="sm"
						className="hover:text-destructive hover:border-destructive/35 cursor-pointer shrink-0"
					>
						<LogOut className="mr-1.5 h-3.5 w-3.5" />
						Log out
					</Button>
				</div>

				<div className="space-y-5">
					<Card className="border-border/40 shadow-xs">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								User Account
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm flex items-center justify-between">
								<span className="text-muted-foreground">Email</span>
								<span className="font-mono font-medium text-foreground">{user.email}</span>
							</div>
							<div className="text-sm flex items-center justify-between mt-2 pt-2 border-t border-border/20">
								<span className="text-muted-foreground">Name</span>
								<span className="font-mono font-medium text-foreground">{user.name}</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/40 shadow-xs">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Sandbox Asset Balances
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="divide-y divide-border/30">
								{Object.entries(user.balance || {}).map(([currency, bal]) => (
									<div
										key={currency}
										className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
									>
										<div className="flex items-center gap-3">
											{COIN_LOGOS[currency] ? (
												<img
													src={COIN_LOGOS[currency]}
													alt={currency}
													className="h-7 w-7 object-contain shrink-0"
												/>
											) : (
												<div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
													{currency[0]}
												</div>
											)}
											<div className="flex flex-col">
												<span className="font-semibold text-foreground">{currency}</span>
												<span className="text-[10px] text-muted-foreground font-medium">
													{ASSET_NAMES[currency] || currency}
												</span>
											</div>
										</div>
										<div className="text-right">
											<span className="font-mono text-foreground font-semibold block">
												{bal.available}
											</span>
											{Number(bal.locked) > 0 && (
												<span className="font-mono text-[10px] text-muted-foreground">
													{bal.locked} locked
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/40 shadow-xs">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Open Orders
							</CardTitle>
						</CardHeader>
						<CardContent className="px-0 py-0">
							{ordersLoading ? (
								<div className="px-6 py-4 space-y-3">
									{Array.from({ length: 2 }).map((_, i) => (
										<div key={i} className="flex items-center gap-3 animate-pulse">
											<div className="h-3 bg-muted rounded w-20" />
											<div className="h-3 bg-muted rounded w-12" />
											<div className="h-3 bg-muted rounded w-16 ml-auto" />
										</div>
									))}
								</div>
							) : orders.length === 0 ? (
								<p className="text-xs font-medium text-muted-foreground py-6 px-6">
									No open orders in this sandbox session
								</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-xs">
										<thead>
											<tr className="border-b border-border/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
												<th className="px-6 py-3 font-semibold text-left">Market</th>
												<th className="px-6 py-3 font-semibold text-left">Side</th>
												<th className="px-6 py-3 font-semibold text-left">Type</th>
												<th className="px-6 py-3 font-semibold text-right">Price</th>
												<th className="px-6 py-3 font-semibold text-right">Qty</th>
												<th className="px-6 py-3 font-semibold text-right">Filled</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/20">
											{orders.map((order) => (
												<tr key={order.orderId} className="hover:bg-muted/10 transition-colors">
													<td className="px-6 py-3 font-mono">{order.symbol.replace("_", "/")}</td>
													<td
														className={`px-6 py-3 font-mono font-semibold ${order.side === "BUY" ? "text-success" : "text-destructive"}`}
													>
														{order.side}
													</td>
													<td className="px-6 py-3 font-mono text-muted-foreground">
														{order.type}
													</td>
													<td className="px-6 py-3 font-mono text-right">
														{order.price ?? "Market"}
													</td>
													<td className="px-6 py-3 font-mono text-right">{order.qty}</td>
													<td className="px-6 py-3 font-mono text-right">
														{Number(order.filledQty) > 0 ? (
															<span className="text-orange-500">
																{((Number(order.filledQty) / Number(order.qty)) * 100).toFixed(1)}%
															</span>
														) : (
															<span className="text-muted-foreground">0%</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</AppLayout>
	);
}
