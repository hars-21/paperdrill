import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [verificationEmail, setVerificationEmail] = useState("");
	const [resendAt, setResendAt] = useState<number | null>(null);
	const [countdown, setCountdown] = useState(0);

	useEffect(() => {
		if (!resendAt) return;

		const updateCountdown = () => {
			const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));

			setCountdown(remaining);

			if (remaining === 0) {
				setResendAt(null);
			}
		};

		updateCountdown();

		const timer = setInterval(updateCountdown, 1000);

		return () => clearInterval(timer);
	}, [resendAt]);

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!name.trim() || !email.trim() || !password.trim()) {
			toast.error("Please fill in all fields");
			return;
		}
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters long");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		setIsLoading(true);
		try {
			const { message } = await api.signup(email, name, password);
			toast.success(message);
			setVerificationEmail(email);
			setResendAt(Date.now() + 30_000);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Signup failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResend = async () => {
		if (!verificationEmail || resendAt) return;

		setIsLoading(true);
		try {
			const { message } = await api.resendVerificationEmail(verificationEmail);
			toast.success(message);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to resend verification email");
		} finally {
			setIsLoading(false);
		}
		setResendAt(Date.now() + 30_000);
	};

	if (verificationEmail) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<Card className="overflow-hidden">
					<CardHeader className="pb-4 text-center">
						<CardTitle className="text-2xl tracking-tight">Check your inbox</CardTitle>

						<CardDescription className="mx-auto mt-2 max-w-sm text-sm leading-6">
							We sent a verification link to{" "}
							<span className="font-medium text-foreground">{verificationEmail}</span>
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6 text-center">
						<div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
							<p>Click the link in the email to verify your account and start trading.</p>
							<p className="mt-1 text-xs text-muted-foreground/70">
								The link will expire in 24 hours.
							</p>
						</div>

						<div className="space-y-3">
							<Button
								className="w-full"
								variant="default"
								disabled={resendAt !== null}
								onClick={handleResend}
							>
								{countdown > 0 ? `Resend email in ${countdown}s` : "Resend verification email"}
							</Button>

							<Link to="/login" className="block">
								<Button variant="ghost" className="w-full">
									Back to login
								</Button>
							</Link>
						</div>

						<p className="text-xs leading-5 text-muted-foreground">
							Didn&apos;t receive the email? Check your spam folder or try resending it.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Create your account</CardTitle>
					<CardDescription>Start trading with paper money</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="name">Full Name</FieldLabel>
								<Input
									id="name"
									type="text"
									placeholder="John Doe"
									value={name}
									onChange={(e) => setName(e.target.value)}
									autoComplete="name"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="johndoe@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoComplete="email"
									required
								/>
							</Field>
							<Field>
								<Field className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="password">Password</FieldLabel>
										<Input
											id="password"
											type="password"
											placeholder="•••••"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											autoComplete="new-password"
											required
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
										<Input
											id="confirm-password"
											type="password"
											placeholder="•••••"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											autoComplete="new-password"
											required
										/>
									</Field>
								</Field>
								<FieldDescription>Must be at least 8 characters long.</FieldDescription>
							</Field>
							<Field>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? "Creating account..." : "Create Account"}
								</Button>
								<FieldDescription className="text-center">
									Already have an account? <Link to="/login">Sign in</Link>
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
