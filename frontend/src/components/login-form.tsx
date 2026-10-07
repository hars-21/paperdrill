import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useAnalytics } from "@/lib/analytics";
import { getSafeReturnTo } from "@/lib/redirect";
import { toast } from "sonner";

export function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const { setUser } = useAuth();
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
			const user = await api.signin(email.trim(), password);
			setUser(user);
			posthog.capture("user_signed_in", { email_verified: user.emailVerified });
			toast.success("Signed in successfully");
			navigate(user.emailVerified ? returnTo : "/verify-email", {
				replace: true,
				state: user.emailVerified ? undefined : { returnTo },
			});
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Failed to sign in.");
		} finally {
			setIsLoading(false);
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

			<form onSubmit={handleSubmit} className="mt-8">
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
						<FieldLabel htmlFor="password">Password</FieldLabel>
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

					<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading}>
						{isLoading ? "Signing in…" : "Sign in"}
					</Button>
				</FieldGroup>
			</form>

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
