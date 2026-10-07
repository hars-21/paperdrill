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

export function SignupForm() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const { setUser } = useAuth();
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
			const { message, ...user } = await api.signup(email.trim(), name.trim(), password);
			setUser(user);
			posthog.capture("user_signed_up", { email_verified: user.emailVerified });
			toast.success(message);
			navigate(user.emailVerified ? returnTo : "/verify-email", {
				replace: true,
				state: user.emailVerified ? undefined : { emailSent: true, returnTo },
			});
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Signup failed.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div>
			<header>
				<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">
					Create your account
				</h1>
				<p className="mt-2 text-sm leading-6 text-medium-emphasis">
					Start trading with credits and build a measurable record.
				</p>
			</header>

			<form onSubmit={handleSubmit} className="mt-8">
				<FieldGroup className="gap-5">
					<Field className="gap-2">
						<FieldLabel htmlFor="name">Full name</FieldLabel>
						<Input
							id="name"
							type="text"
							placeholder="Aarav Mehta"
							name="name"
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
					</Field>

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
							aria-describedby={
								formError ? "password-requirement signup-error" : "password-requirement"
							}
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

					<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading}>
						{isLoading ? "Creating account…" : "Create account"}
					</Button>
				</FieldGroup>
			</form>

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
