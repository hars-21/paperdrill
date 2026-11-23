import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { getSafeReturnTo } from "@/lib/redirect";
import { toast } from "sonner";

export function OnboardingPage() {
	const { user, refreshUser } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const returnTo = getSafeReturnTo(location.state);
	const [name, setName] = useState(user?.name ?? "");
	const [username, setUsername] = useState(user?.username ?? "");
	const [isLoading, setIsLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		if (!user) return;
		setName((current) => current || user.name);
		setUsername((current) => current || user.username || "");
	}, [user]);

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();
		if (!user) return;
		setFormError(null);

		const trimmedName = name.trim();
		const normalizedUsername = username.trim().toLowerCase();
		if (!trimmedName) {
			setFormError("Enter a display name.");
			return;
		}
		if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
			setFormError("Username must be 3-20 characters and use letters, numbers, or underscores.");
			return;
		}

		setIsLoading(true);
		try {
			await api.completeOnboarding({ name: trimmedName, username: normalizedUsername });
			let starterAmount: string | null = null;
			if (!user.starterClaimed) {
				const result = await api.claimStarterCredit();
				if (result.claimed) starterAmount = `${result.amount} ${result.asset}`;
			}
			await refreshUser();
			toast.success(
				starterAmount ? `Profile ready. ${starterAmount} was added to your balance.` : "Profile ready.",
			);
			navigate(returnTo, { replace: true });
		} catch (error) {
			if (error instanceof ApiError) {
				setFormError(error.message);
			} else {
				setFormError(error instanceof Error ? error.message : "Onboarding failed.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthShell>
			<div>
				<header>
					<p className="text-xs font-medium tracking-[0.18em] text-low-emphasis uppercase">
						One last step
					</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-high-emphasis">
						Set up your trader profile
					</h1>
					<p className="mt-2 text-sm leading-6 text-medium-emphasis">
						Choose how you appear on PaperDrill. Your display name can change later; your username is
						your permanent handle.
					</p>
				</header>

				<form onSubmit={handleSubmit} className="mt-8">
					<FieldGroup className="gap-5">
						<Field className="gap-2">
							<FieldLabel htmlFor="display-name">Display name</FieldLabel>
							<Input
								id="display-name"
								type="text"
								value={name}
								onChange={(event) => {
									setName(event.target.value);
									setFormError(null);
								}}
								maxLength={40}
								autoComplete="name"
								className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
								required
							/>
							<FieldDescription className="text-xs">
								Shown on your profile, leaderboard, and trade history. We don&apos;t ask for your legal
								name.
							</FieldDescription>
						</Field>

						<Field className="gap-2">
							<FieldLabel htmlFor="username">Username</FieldLabel>
							<Input
								id="username"
								type="text"
								value={username}
								onChange={(event) => {
									setUsername(event.target.value);
									setFormError(null);
								}}
								minLength={3}
								maxLength={20}
								autoComplete="username"
								spellCheck={false}
								placeholder="trader_01"
								aria-invalid={Boolean(formError)}
								aria-describedby={formError ? "onboarding-error" : "username-help"}
								className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
								disabled={Boolean(user?.username)}
								required
							/>
							<FieldDescription id="username-help" className="text-xs">
								3-20 characters: letters, numbers, and underscores. Usernames cannot be changed later.
							</FieldDescription>
						</Field>

						<div className="border-t border-border/50 pt-5">
							<p className="text-sm font-medium text-high-emphasis">Starter balance</p>
							<p className="mt-1 text-sm leading-6 text-medium-emphasis">
								10,000 USD in paper credits will be added when you finish setup. Daily credits can be
								claimed later from Rewards.
							</p>
						</div>

						<FieldError
							id="onboarding-error"
							className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5"
						>
							{formError}
						</FieldError>

						<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading || !user}>
							{isLoading ? "Finishing setup…" : "Create profile and add balance"}
						</Button>
					</FieldGroup>
				</form>
			</div>
		</AuthShell>
	);
}
