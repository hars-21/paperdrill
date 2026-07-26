import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-medium text-medium-emphasis">
								User Account
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm flex items-center justify-between">
								<span className="text-muted-foreground">Email</span>
								<span className="font-medium text-high-emphasis">{user.email}</span>
							</div>
							<div className="text-sm flex items-center justify-between mt-2 pt-2 border-t border-border/20">
								<span className="text-muted-foreground">Name</span>
								<span className="font-medium text-high-emphasis">{user.name}</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/40 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-xs font-medium text-medium-emphasis">
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
												<span className="text-[10px] text-low-emphasis font-medium">
													{ASSET_NAMES[currency] || currency}
												</span>
											</div>
										</div>
										<div className="text-right">
											<span className="text-high-emphasis font-semibold block">
												{bal.available ?? "0"}
											</span>
											{Number(bal.locked ?? 0) > 0 && (
												<span className="text-[10px] text-low-emphasis">
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
							<CardTitle className="text-xs font-medium text-medium-emphasis">
								Orders
							</CardTitle>
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
