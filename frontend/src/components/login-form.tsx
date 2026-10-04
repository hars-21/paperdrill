import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useAnalytics } from "@/lib/analytics";
import { getSafeReturnTo } from "@/lib/redirect";
import { toast } from "sonner";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
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
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Welcome back</CardTitle>
					<CardDescription>Sign in to your PaperDrill account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									name="email"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										setFormError(null);
									}}
									autoComplete="email"
									spellCheck={false}
									aria-invalid={Boolean(formError)}
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									name="password"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
										setFormError(null);
									}}
									autoComplete="current-password"
									aria-invalid={Boolean(formError)}
									required
								/>
							</Field>
							<FieldError>{formError}</FieldError>
							<Field>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? "Signing in…" : "Sign in"}
								</Button>
								<FieldDescription className="text-center">
									Don&apos;t have an account? <Link to="/signup" state={{ returnTo }}>Sign up</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and{" "}
				<Link to="/privacy">Privacy Policy</Link>.
			</FieldDescription>
		</div>
	);
}
