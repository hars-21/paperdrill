import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import { useAnalytics } from "@/lib/analytics";
import { getSafeReturnTo } from "@/lib/redirect";
import { toast } from "sonner";

export function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const { refreshUser } = useAuth();
	const posthog = useAnalytics();
	const navigate = useNavigate();
	const location = useLocation();
	const returnTo = getSafeReturnTo(location.state);

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setFormError(null);
		if (!email.trim() || !password.trim()) {
			setFormError("Enter both your email and password.");
			return;
		}

		setIsLoading(true);
		try {
			const result = await authClient.signIn.email({
				email: email.trim(),
				password,
			});

			if (result.error) {
				setFormError(result.error.message ?? "Failed to sign in.");
				return;
			}

			posthog.capture("user_signed_in");
			await refreshUser();
			toast.success("Signed in successfully");
			navigate(returnTo, { replace: true });
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Failed to sign in.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setFormError(null);
		setIsGoogleLoading(true);
		try {
			const callbackURL = new URL("/onboarding", window.location.origin);
			callbackURL.searchParams.set("returnTo", returnTo);
			await authClient.signIn.social({
				provider: "google",
				callbackURL: callbackURL.toString(),
				errorCallbackURL: `${window.location.origin}/login`,
			});
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Failed to continue with Google.");
			setIsGoogleLoading(false);
		}
	};

	return (
		<div>
			<header>
				<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">Welcome back</h1>
				<p className="mt-2 text-sm leading-6 text-medium-emphasis">
					Continue to your portfolio and trading workspace.
				</p>
			</header>

			<div className="mt-8 space-y-5">
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="h-11 w-full"
					onClick={() => void handleGoogleSignIn()}
					disabled={isLoading || isGoogleLoading}
				>
					{isGoogleLoading ? "Continuing…" : "Continue with Google"}
				</Button>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t border-border/50" />
					</div>
					<div className="relative flex justify-center text-xs text-medium-emphasis">
						<span className="bg-background px-2">or</span>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					<FieldGroup className="gap-5">
						<Field className="gap-2">
							<FieldLabel htmlFor="email">Email address</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								name="email"
								value={email}
								onChange={(event) => {
									setEmail(event.target.value);
									setFormError(null);
								}}
								autoComplete="email"
								spellCheck={false}
								aria-invalid={Boolean(formError)}
								aria-describedby={formError ? "login-error" : undefined}
								className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
								required
							/>
						</Field>

						<Field className="gap-2">
							<div className="flex items-center justify-between gap-3">
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Link
									to="/forgot-password"
									className="text-xs font-medium text-medium-emphasis underline-offset-4 hover:text-high-emphasis hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								name="password"
								value={password}
								onChange={(event) => {
									setPassword(event.target.value);
									setFormError(null);
								}}
								autoComplete="current-password"
								aria-invalid={Boolean(formError)}
								aria-describedby={formError ? "login-error" : undefined}
								className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
								required
							/>
						</Field>

						<FieldError
							id="login-error"
							className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5"
						>
							{formError}
						</FieldError>

						<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading || isGoogleLoading}>
							{isLoading ? "Signing in…" : "Sign in"}
						</Button>
					</FieldGroup>
				</form>
			</div>

			<p className="mt-7 border-t border-border/50 pt-6 text-sm text-medium-emphasis">
				Don&apos;t have an account?{" "}
				<Link to="/signup" state={{ returnTo }} className="font-medium text-high-emphasis underline-offset-4 hover:underline">
					Create one
				</Link>
			</p>

			<FieldDescription className="mt-8 text-xs leading-5">
				By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and{" "}
				<Link to="/privacy">Privacy Policy</Link>.
			</FieldDescription>
		</div>
	);
}
