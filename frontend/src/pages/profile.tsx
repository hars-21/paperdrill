import { useState } from "react";
import { Check, Copy, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DashboardPage } from "@/components/dashboard-page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export function ProfilePage() {
	const { user, setUser } = useAuth();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);

	if (!user) return null;

	const copyUserId = async () => {
		await navigator.clipboard.writeText(user.id);
		setCopied(true);
		toast.success("Account ID copied");
	};

	const handleLogout = async () => {
		try {
			await api.signout();
		} catch (error) {
			console.error("Signout failed:", error);
		} finally {
			setUser(null);
			toast.success("Logged out successfully");
			navigate("/");
		}
	};

	return (
		<DashboardPage
			title="Profile"
			description="Your basic account details and session controls."
			action={
				<Button size="sm" onClick={handleLogout}>
					<LogOut /> Log out
				</Button>
			}
		>
			<div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
				<Card className="items-center gap-0 border-border/60 py-8 text-center shadow-none">
					<CardContent className="px-6">
						<Avatar className="mx-auto size-20">
							<AvatarFallback className="bg-l3 text-2xl font-semibold text-high-emphasis">
								{user.name.slice(0, 1).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<h2 className="mt-4 text-xl font-semibold text-high-emphasis">{user.name}</h2>
						<p className="mt-1 break-all text-sm text-medium-emphasis">{user.email}</p>
						<p className="mt-4 inline-flex items-center gap-1.5 text-sm text-green-text">
							<ShieldCheck className="size-4" /> Email verified
						</p>
					</CardContent>
				</Card>

				<div className="overflow-hidden rounded-xl border border-border/60 bg-l1">
					<DetailRow icon={UserRound} label="Name" value={user.name} />
					<DetailRow icon={Mail} label="Email address" value={user.email} />
					<div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
						<div className="flex min-w-44 items-center gap-3 text-sm text-medium-emphasis">
							<ShieldCheck className="size-4" /> Account ID
						</div>
						<div className="flex min-w-0 flex-1 items-center gap-2 sm:justify-end">
							<span className="truncate font-mono text-xs text-high-emphasis">{user.id}</span>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={copyUserId}
								aria-label="Copy account ID"
							>
								{copied ? <Check /> : <Copy />}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</DashboardPage>
	);
}

function DetailRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof UserRound;
	label: string;
	value: string;
}) {
	return (
		<div className="flex flex-col gap-2 border-b border-border/40 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
			<div className="flex min-w-44 items-center gap-3 text-sm text-medium-emphasis">
				<Icon className="size-4" /> {label}
			</div>
			<p className="min-w-0 flex-1 break-all text-sm font-medium text-high-emphasis sm:text-right">
				{value}
			</p>
		</div>
	);
}
