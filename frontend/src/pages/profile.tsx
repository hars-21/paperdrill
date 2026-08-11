import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/loader";
import { ASSET_NAMES, COIN_LOGOS } from "@/utils/misc";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Page, PageHeader, PageContent } from "@/components/ui/page";
import { OrdersTable } from "@/components/market/orders-table";

export function ProfilePage() {
	const { user, setUser, loading } = useAuth();
	const navigate = useNavigate();

	if (loading) return <Loader />;
	if (!user) return <Navigate to="/" replace />;

	const handleLogout = async () => {
		try {
			await api.signout();
		} catch (err) {
			console.error("Signout failed:", err);
		} finally {
			setUser(null);
			toast.success("Logged out successfully");
			navigate("/");
		}
	};

	const balances = Object.entries(user.balance || {});
	const assetCount = balances.length;

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

			<PageContent className="max-w-3xl">
				<div className="space-y-5">
					<Card className="border-border/40 shadow-sm">
						<CardContent className="flex items-center gap-4">
							<Avatar className="size-14">
								<AvatarFallback className="bg-l3 text-lg font-bold text-high-emphasis">
									{user.name[0]}
								</AvatarFallback>
							</Avatar>

							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<h2 className="truncate text-lg font-bold tracking-tight text-high-emphasis">
										{user.name}
									</h2>
								</div>
								<p className="truncate text-sm text-muted-foreground">{user.email}</p>
							</div>

							<div className="hidden sm:block text-right shrink-0">
								<p className="flex items-center justify-end gap-1 text-[10px] text-low-emphasis">
									<ShieldCheck className="size-3" />
									Role
								</p>
								<p className="mt-0.5 text-sm font-medium text-high-emphasis">Trader</p>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/40 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-medium text-medium-emphasis">
								Sandbox Asset Balances
							</CardTitle>
							<CardAction>
								<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-medium-emphasis">
									{assetCount} {assetCount === 1 ? "asset" : "assets"}
								</span>
							</CardAction>
						</CardHeader>
						<CardContent>
							{assetCount === 0 ? (
								<div className="py-6 text-center">
									<p className="text-sm text-medium-emphasis">No balances yet</p>
									<p className="mt-1 text-xs text-low-emphasis">
										Funds are credited when you place your first order.
									</p>
								</div>
							) : (
								<div className="grid gap-2 sm:grid-cols-2">
									{balances.map(([currency, bal]) => (
										<div
											key={currency}
											className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-muted/20 px-3.5 py-3 transition-colors hover:border-border/60"
										>
											<div className="flex items-center gap-3 min-w-0">
												{COIN_LOGOS[currency] ? (
													<img
														src={COIN_LOGOS[currency]}
														alt={currency}
														className="h-8 w-8 object-contain shrink-0"
													/>
												) : (
													<div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
														{currency[0]}
													</div>
												)}
												<div className="flex flex-col min-w-0">
													<span className="font-semibold text-high-emphasis">{currency}</span>
													<span className="text-[10px] text-low-emphasis truncate">
														{ASSET_NAMES[currency] || currency}
													</span>
												</div>
											</div>
											<div className="text-right shrink-0">
												<span className="block text-sm font-semibold text-high-emphasis">
													{bal.available ?? "0"}
												</span>
												{Number(bal.locked ?? 0) > 0 && (
													<span className="text-[10px] text-low-emphasis">{bal.locked} locked</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="border-border/40 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-medium text-medium-emphasis">Orders</CardTitle>
						</CardHeader>
						<CardContent>
							<OrdersTable />
						</CardContent>
					</Card>
				</div>
			</PageContent>
		</Page>
	);
}
