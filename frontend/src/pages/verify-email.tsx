import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Status = "waiting" | "verifying" | "success" | "error";

export function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const { user, verified, loading, refreshUser, setUser } = useAuth();
	const posthog = useAnalytics();
	const navigate = useNavigate();
	const location = useLocation();
	const emailWasJustSent = Boolean((location.state as { emailSent?: boolean } | null)?.emailSent);
	const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
	const [resending, setResending] = useState(false);
	const [editingEmail, setEditingEmail] = useState(false);
	const [email, setEmail] = useState("");
	const [updatingEmail, setUpdatingEmail] = useState(false);
	const [resendAt, setResendAt] = useState<number | null>(() =>
		emailWasJustSent ? Date.now() + 30_000 : null,
	);
	const [countdown, setCountdown] = useState(emailWasJustSent ? 30 : 0);
	const verificationComplete = verified || status === "success";

	useEffect(() => {
		if (!editingEmail) setEmail(user?.email ?? "");
	}, [editingEmail, user?.email]);

	useEffect(() => {
		if (!resendAt) return;

		const updateCountdown = () => {
			const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
			setCountdown(remaining);
			if (remaining === 0) setResendAt(null);
		};

		updateCountdown();
		const timer = window.setInterval(updateCountdown, 1000);
		return () => window.clearInterval(timer);
	}, [resendAt]);

	useEffect(() => {
		if (!token || loading || verified) return;
		let active = true;

		api
			.verifyEmail(token)
			.then((result) => {
				if (!active) return;
				refreshUser();
				posthog.capture("email_verified");
				setStatus("success");
				toast.success(result.message);
			})
			.catch((error) => {
				if (!active) return;
				setStatus("error");
				toast.error(error instanceof Error ? error.message : "Email verification failed");
			});

		return () => {
			active = false;
		};
	}, [token, loading, verified, posthog, refreshUser]);

	useEffect(() => {
		if (!verified) return;
		const timer = window.setTimeout(() => navigate("/dashboard", { replace: true }), 1000);
		return () => window.clearTimeout(timer);
	}, [verified, navigate]);

	const handleResend = async () => {
		if (!user || resending || resendAt) return;
		setResending(true);
		try {
			const result = await api.resendVerificationEmail(user.email);
			setResendAt(Date.now() + 30_000);
			setCountdown(30);
			setStatus("waiting");
			navigate("/verify-email", { replace: true });
			toast.success(result.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to resend verification email");
		} finally {
			setResending(false);
		}
	};

	const handleEmailUpdate = async (event: React.SubmitEvent) => {
		event.preventDefault();
		if (!user || updatingEmail) return;
		const nextEmail = email.trim();
		if (nextEmail === user.email) {
			setEditingEmail(false);
			return;
		}

		setUpdatingEmail(true);
		try {
			const { message, ...updatedUser } = await api.updateEmail(nextEmail);
			setUser(updatedUser);
			setEditingEmail(false);
			setResendAt(Date.now() + 30_000);
			setCountdown(30);
			setStatus("waiting");
			navigate("/verify-email", { replace: true });
			posthog.capture("verification_email_updated");
			toast.success(message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to update email");
		} finally {
			setUpdatingEmail(false);
		}
	};

	if (loading || status === "verifying") {
		return (
			<div className="flex w-full flex-1 items-center justify-center gap-2 text-sm text-medium-emphasis">
				<Loader2 className="size-4 animate-spin" />
				Verifying your email...
			</div>
		);
	}

	return (
		<div className="flex w-full flex-1 items-center justify-center px-4 py-6 sm:px-6">
			<Card className="w-full max-w-sm px-2 py-8 sm:px-4 sm:py-10">
				<CardHeader className="text-left">
					<CardTitle className="text-xl pb-4">
						{verificationComplete
							? "Email verified"
							: status === "error"
								? "Verification failed"
								: "Check your inbox"}
					</CardTitle>
					<CardDescription>
						{verificationComplete ? (
							user
								? "Your email has been successfully verified. Redirecting to your dashboard..."
								: "Your email has been successfully verified. Sign in to continue."
						) : user ? (
							<>
								To create your PaperDrill account, click the verification button in the email we
								sent to: <span className="font-medium text-foreground">{user.email}</span>.
							</>
						) : (
							"Sign in to request a new verification email."
						)}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{user && !verificationComplete && (
						<>
							{editingEmail ? (
								<form onSubmit={handleEmailUpdate} className="space-y-3">
									<label htmlFor="verification-email" className="text-sm font-medium">
										Email address
									</label>
									<Input
										id="verification-email"
										type="email"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										autoComplete="email"
										autoFocus
										required
									/>
									<div className="flex gap-2">
										<Button type="submit" className="flex-1" disabled={updatingEmail}>
											{updatingEmail ? "Updating..." : "Update and resend"}
										</Button>
										<Button
											type="button"
											variant="ghost"
											disabled={updatingEmail}
											onClick={() => {
												setEmail(user.email);
												setEditingEmail(false);
											}}
										>
											Cancel
										</Button>
									</div>
								</form>
							) : (
								<Button
									type="button"
									variant="ghost"
									className="h-auto w-fit px-0 text-sm text-medium-emphasis hover:bg-transparent hover:text-high-emphasis"
									onClick={() => setEditingEmail(true)}
								>
									Wrong email? Change it
								</Button>
							)}
							<CardDescription>Don't see the email in your inbox or spam folder?</CardDescription>
							<Button
								className="w-full"
								variant="inverted"
								onClick={handleResend}
								disabled={resending || resendAt !== null}
							>
								{resending
									? "Sending..."
									: countdown > 0
										? `Resend in ${countdown}s`
										: "Click here to resend"}
							</Button>
						</>
					)}
					{!user && !verified && (
						<Button asChild className="w-full">
							<Link to="/login">Sign in</Link>
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
