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
			if (!user.starterClaimed) {
				const result = await api.claimStarterCredit();
				if (result.claimed) {
					toast.success(`Starter balance claimed: +${result.amount} ${result.asset}`);
				}
			}
			await refreshUser();
			toast.success("You're all set");
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
					<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">Set up your account</h1>
					<p className="mt-2 text-sm leading-6 text-medium-emphasis">
						Choose a username and claim your starter balance to begin trading.
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
								Shown on your profile and public rankings.
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

						<div className="rounded-lg border border-border/60 bg-l1 px-4 py-3">
							<p className="text-sm font-medium text-high-emphasis">Starter balance</p>
							<p className="mt-1 text-sm text-medium-emphasis">
								Claim <span className="font-medium text-high-emphasis">10,000 USD</span> in paper credits to
								start trading.
							</p>
						</div>

						<FieldError
							id="onboarding-error"
							className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5"
						>
							{formError}
						</FieldError>

						<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading || !user}>
							{isLoading ? "Finishing setup…" : "Save and claim starter balance"}
						</Button>
					</FieldGroup>
				</form>
			</div>
		</AuthShell>
	);
}
