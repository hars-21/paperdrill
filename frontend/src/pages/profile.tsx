import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/loader";
import { ASSET_NAMES, COIN_LOGOS } from "@/utils/misc";
import type { OrderRecord } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Page, PageHeader, PageContent } from "@/components/ui/page";

export function ProfilePage() {
	const { user, setUser, loading, refreshUser } = useAuth();
	const [orders, setOrders] = useState<OrderRecord[]>([]);
	const [ordersLoading, setOrdersLoading] = useState(true);

	useEffect(() => {
		if (!user) return;

		const init = async () => {
			await refreshUser();
			try {
				const data = await api.getOpenOrders();
				setOrders(data);
			} catch (err) {
				console.error("Failed to load open orders:", err);
				toast.error("Failed to load open orders");
			} finally {
				setOrdersLoading(false);
			}
		};
		init();
	}, []);

	if (loading) return <Loader />;
	if (!user) return <Navigate to="/" replace />;

	const handleLogout = async () => {
		try {
			await api.signout();
		} catch (err) {
			console.error("Signout failed:", err);
		}
		setUser(null);
		toast.success("Logged out successfully");
	};

	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Account Profile</h1>
					<p className="text-xs text-muted-foreground mt-1">
						Manage sandbox balances and review recent trade execution activity.
					</p>
				</div>
				<Button
					onClick={handleLogout}
					variant="secondary"
					size="sm"
					className="hover:text-destructive hover:border-destructive/35 cursor-pointer shrink-0 gap-1.5"
				>
					<LogOut className="size-3.5" />
					Log out
				</Button>
			</PageHeader>

			<PageContent className="max-w-3xl animate-fade-in">
				<div className="space-y-5">
					<Card className="border-border/40 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								User Account
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm flex items-center justify-between">
								<span className="text-muted-foreground">Email</span>
								<span className="font-mono font-medium text-high-emphasis">{user.email}</span>
							</div>
							<div className="text-sm flex items-center justify-between mt-2 pt-2 border-t border-border/20">
								<span className="text-muted-foreground">Name</span>
								<span className="font-mono font-medium text-high-emphasis">{user.name}</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/40 shadow-sm">
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
												<span className="font-semibold text-high-emphasis">{currency}</span>
												<span className="text-[10px] text-muted-foreground font-medium">
													{ASSET_NAMES[currency] || currency}
												</span>
											</div>
										</div>
										<div className="text-right">
											<span className="font-mono text-high-emphasis font-semibold block">
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

					<Card className="border-border/40 shadow-sm">
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
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="px-6 py-3 text-left">Market</TableHead>
											<TableHead className="px-6 py-3 text-left">Side</TableHead>
											<TableHead className="px-6 py-3 text-left">Type</TableHead>
											<TableHead className="px-6 py-3 text-right">Price</TableHead>
											<TableHead className="px-6 py-3 text-right">Qty</TableHead>
											<TableHead className="px-6 py-3 text-right">Filled</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{orders.map((order) => (
											<TableRow key={order.orderId}>
												<TableCell className="px-6 py-3">
													{order.symbol.replace("_", "/")}
												</TableCell>
												<TableCell
													className={`px-6 py-3 font-semibold ${order.side === "BUY" ? "text-success" : "text-destructive"}`}
												>
													{order.side}
												</TableCell>
												<TableCell className="px-6 py-3 text-muted-foreground">
													{order.type}
												</TableCell>
												<TableCell className="px-6 py-3 text-right">
													{order.price ?? "Market"}
												</TableCell>
												<TableCell className="px-6 py-3 text-right">{order.qty}</TableCell>
												<TableCell className="px-6 py-3 text-right">
													{Number(order.filledQty) > 0 ? (
														<span className="text-orange-500">
															{((Number(order.filledQty) / Number(order.qty)) * 100).toFixed(1)}%
														</span>
													) : (
														<span className="text-muted-foreground">0%</span>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</PageContent>
		</Page>
	);
}
