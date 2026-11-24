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

function temporaryNameFromEmail(email: string) {
	const localPart = email.trim().split("@")[0] ?? "";
	const cleaned = localPart
		.replace(/[._-]+/g, " ")
		.replace(/[^a-zA-Z0-9 ]/g, "")
		.trim()
		.replace(/\s+/g, " ");

	return cleaned.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 40) || "Trader";
}

export function SignupForm() {
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

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();
		setFormError(null);
		if (password.length < 8) {
			setFormError("Password must be at least 8 characters long.");
			return;
		}

		setIsLoading(true);
		try {
			const emailAddress = email.trim();
			const result = await authClient.signUp.email({
				name: temporaryNameFromEmail(emailAddress),
				email: emailAddress,
				password,
			});

			if (result.error) {
				setFormError(result.error.message ?? "Signup failed.");
				return;
			}

			posthog.capture("user_signed_up");
			await refreshUser();
			toast.success("Account created. Check your email to verify it.");
			navigate("/verify-email", {
				replace: true,
				state: { emailSent: true, returnTo },
			});
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Signup failed.");
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
				errorCallbackURL: `${window.location.origin}/signup`,
			});
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Failed to continue with Google.");
			setIsGoogleLoading(false);
		}
	};

	return (
		<div>
			<header>
				<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">Create your account</h1>
				<p className="mt-2 text-sm leading-6 text-medium-emphasis">
					Start with your email, then choose the name and username others will see.
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
							<FieldLabel htmlFor="signup-email">Email address</FieldLabel>
							<Input
								id="signup-email"
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
								aria-describedby={formError ? "signup-error" : undefined}
								className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
								required
							/>
						</Field>

						<Field className="gap-2">
							<FieldLabel htmlFor="signup-password">Password</FieldLabel>
							<Input
								id="signup-password"
								type="password"
								placeholder="Create a password"
								name="password"
								value={password}
								onChange={(event) => {
									setPassword(event.target.value);
									setFormError(null);
								}}
								autoComplete="new-password"
								minLength={8}
								aria-invalid={Boolean(formError)}
								aria-describedby={formError ? "password-requirement signup-error" : "password-requirement"}
								className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
								required
							/>
							<FieldDescription id="password-requirement" className="text-xs">
								Use at least 8 characters.
							</FieldDescription>
						</Field>

						<FieldError
							id="signup-error"
							className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5"
						>
							{formError}
						</FieldError>

						<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading || isGoogleLoading}>
							{isLoading ? "Creating account…" : "Create account"}
						</Button>
					</FieldGroup>
				</form>
			</div>

			<p className="mt-7 border-t border-border/50 pt-6 text-sm text-medium-emphasis">
				Already have an account?{" "}
				<Link to="/login" state={{ returnTo }} className="font-medium text-high-emphasis underline-offset-4 hover:underline">
					Sign in
				</Link>
			</p>

			<FieldDescription className="mt-8 text-xs leading-5">
				By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and{" "}
				<Link to="/privacy">Privacy Policy</Link>.
			</FieldDescription>
		</div>
	);
}
