import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Page, PageContent } from "@/components/ui/page";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function getInitials(name: string) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

function DetailRow({
	label,
	value,
	description,
	action,
	mono = false,
}: {
	label: string;
	value: string;
	description: string;
	action?: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="grid gap-3 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:px-5">
			<p className="text-xs font-medium text-medium-emphasis">{label}</p>
			<div className="min-w-0">
				<p
					className={
						mono
							? "truncate font-mono text-xs text-high-emphasis"
							: "break-all text-sm font-medium text-high-emphasis"
					}
				>
					{value}
				</p>
				<p className="mt-1 text-xs leading-5 text-low-emphasis">{description}</p>
			</div>
			{action ? <div className="justify-self-start sm:justify-self-end">{action}</div> : null}
		</div>
	);
}

function AccessRow({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p className="text-sm font-medium text-high-emphasis">{title}</p>
				<p className="mt-1 max-w-2xl text-xs leading-5 text-medium-emphasis">{description}</p>
			</div>
			<div className="shrink-0 self-start sm:self-auto">{action}</div>
		</div>
	);
}

export function ProfilePage() {
	const { user, verified, setUser } = useAuth();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);
	const [loggingOut, setLoggingOut] = useState(false);

	if (!user) return null;

	const copyUserId = async () => {
		try {
			await navigator.clipboard.writeText(user.id);
			setCopied(true);
			toast.success("Account ID copied");
		} catch {
			toast.error("Could not copy the account ID");
		}
	};

	const handleLogout = async () => {
		if (loggingOut) return;
		setLoggingOut(true);
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
		<Page>
			<PageContent className="max-w-6xl space-y-6">
				<header>
					<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">Profile</h1>
					<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
						Your identity, account status and access settings.
					</p>
				</header>

				<section
					className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
					aria-labelledby="personal-details-title"
				>
					<div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
						<div className="flex flex-col border-b border-border/40 bg-l2/25 p-5 sm:p-6 lg:border-r lg:border-b-0">
							<Avatar className="size-20 border border-border/60 shadow-sm">
								<AvatarFallback className="bg-l1 text-xl font-semibold tracking-tight text-high-emphasis">
									{getInitials(user.name)}
								</AvatarFallback>
							</Avatar>
							<h2 className="mt-5 text-xl font-semibold tracking-tight text-high-emphasis">
								{user.name}
							</h2>
							<p className="mt-1 break-all text-sm text-medium-emphasis">{user.email}</p>

							<div className="mt-6 border-t border-border/50 pt-4 lg:mt-auto">
								<p className={verified ? "text-xs font-medium text-green-text" : "text-xs font-medium text-medium-emphasis"}>
									{verified ? "Email verified" : "Verification required"}
								</p>
								<p className="mt-1 text-xs leading-5 text-low-emphasis">
									{verified
										? "Your account can create orders and API keys."
										: "Verify your email to unlock account actions."}
								</p>
							</div>
						</div>

						<div>
							<div className="border-b border-border/40 px-4 py-4 sm:px-5">
								<h2 id="personal-details-title" className="text-sm font-semibold text-high-emphasis">
									Personal details
								</h2>
								<p className="mt-1 text-xs text-medium-emphasis">
									Information attached to your PaperDrill account.
								</p>
							</div>

							<div className="divide-y divide-border/30">
								<DetailRow
									label="Display name"
									value={user.name}
									description="Shown on public rankings and across your account."
								/>
								<DetailRow
									label="Email address"
									value={user.email}
									description="Used for sign-in, verification and account communication."
									action={
										verified ? (
											<span className="text-xs font-medium text-green-text">Verified</span>
										) : (
											<Button asChild variant="outline" size="sm">
												<Link to="/verify-email" state={{ returnTo: "/settings/profile" }}>
													Verify email
												</Link>
											</Button>
										)
									}
								/>
								<DetailRow
									label="Account ID"
									value={user.id}
									description="Your unique identifier across account and API records."
									mono
									action={
										<Button type="button" variant="ghost" size="sm" onClick={copyUserId}>
											{copied ? "Copied" : "Copy"}
										</Button>
									}
								/>
							</div>
						</div>
					</div>
				</section>

				<section aria-labelledby="account-access-title">
					<div>
						<h2 id="account-access-title" className="text-base font-semibold text-high-emphasis">
							Account access
						</h2>
						<p className="mt-1 text-sm text-medium-emphasis">
							Manage programmatic access and your current session.
						</p>
					</div>

					<div className="mt-4 divide-y divide-border/40 border-y border-border/60">
						<AccessRow
							title="API keys"
							description="Create and revoke scoped credentials for bots and server-side clients."
							action={
								<Button asChild variant="outline" size="sm">
									<Link to="/settings/api-keys">Manage API keys</Link>
								</Button>
							}
						/>
						<AccessRow
							title="Current session"
							description={`Signed in as ${user.email}. Logging out clears this browser session.`}
							action={
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={loggingOut}
									onClick={() => void handleLogout()}
									className="hover:border-red-text/40 hover:bg-transparent hover:text-red-text"
								>
									{loggingOut ? "Logging out…" : "Log out"}
								</Button>
							}
						/>
					</div>
				</section>
			</PageContent>
		</Page>
	);
}
