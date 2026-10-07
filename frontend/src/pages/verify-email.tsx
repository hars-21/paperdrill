import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAnalytics } from "@/lib/analytics";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getSafeReturnTo, type ReturnLocationState } from "@/lib/redirect";
import { toast } from "sonner";

type Status = "waiting" | "verifying" | "success" | "error";

export function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const { user, verified, loading, refreshUser, setUser } = useAuth();
	const posthog = useAnalytics();
	const navigate = useNavigate();
	const location = useLocation();
	const locationState = location.state as ReturnLocationState | null;
	const emailWasJustSent = Boolean(locationState?.emailSent);
	const returnTo = getSafeReturnTo(location.state);
	const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
	const [verificationError, setVerificationError] = useState<string | null>(null);
	const [resending, setResending] = useState(false);
	const [editingEmail, setEditingEmail] = useState(false);
	const [email, setEmail] = useState("");
	const [updatingEmail, setUpdatingEmail] = useState(false);
	const [emailError, setEmailError] = useState<string | null>(null);
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
				setVerificationError(
					error instanceof Error ? error.message : "Email verification failed.",
				);
			});

		return () => {
			active = false;
		};
	}, [token, loading, verified, posthog, refreshUser]);

	useEffect(() => {
		if (!verified) return;
		const timer = window.setTimeout(() => navigate(returnTo, { replace: true }), 1000);
		return () => window.clearTimeout(timer);
	}, [verified, navigate, returnTo]);

	const handleResend = async () => {
		if (!user || resending || resendAt) return;
		setResending(true);
		try {
			const result = await api.resendVerificationEmail(user.email);
			setResendAt(Date.now() + 30_000);
			setCountdown(30);
			setStatus("waiting");
			setVerificationError(null);
			navigate("/verify-email", { replace: true, state: { returnTo } });
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
		setEmailError(null);
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
			setVerificationError(null);
			navigate("/verify-email", { replace: true, state: { returnTo } });
			posthog.capture("verification_email_updated");
			toast.success(message);
		} catch (error) {
			setEmailError(error instanceof Error ? error.message : "Failed to update email.");
		} finally {
			setUpdatingEmail(false);
		}
	};

	if (loading || status === "verifying") {
		return (
			<AuthShell>
				<div role="status" aria-live="polite">
					<div className="h-px overflow-hidden bg-border" aria-hidden="true">
						<div className="h-full w-1/2 animate-pulse bg-primary" />
					</div>
					<h1 className="mt-8 text-3xl font-semibold tracking-tight text-high-emphasis">
						Verifying your email
					</h1>
					<p className="mt-2 text-sm leading-6 text-medium-emphasis">
						Checking your verification link. This should only take a moment.
					</p>
				</div>
			</AuthShell>
		);
	}

	const heading = verificationComplete
		? "Email verified"
		: status === "error"
			? "Verification failed"
			: "Check your inbox";
	const description = verificationComplete
		? user
			? "Your email is verified. Returning you to PaperDrill."
			: "Your email is verified. Sign in to continue."
		: status === "error"
			? verificationError ?? "This verification link is invalid or has expired."
			: user
				? "Open the verification email we sent and confirm your address to continue."
				: "Sign in to request a new verification email.";

	return (
		<AuthShell>
			<div aria-live="polite">
				<header>
					<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">{heading}</h1>
					<p
						className={`mt-2 text-sm leading-6 ${status === "error" ? "text-red-text" : "text-medium-emphasis"}`}
					>
						{description}
					</p>
				</header>

				{user && !verificationComplete ? (
					<div className="mt-8">
						<div className="flex items-center justify-between gap-4 border-y border-border/50 py-4">
							<div className="min-w-0">
								<p className="text-xs text-medium-emphasis">Verification email</p>
								<p className="mt-1 truncate text-sm font-medium text-high-emphasis">{user.email}</p>
							</div>
							{!editingEmail ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="shrink-0"
									onClick={() => setEditingEmail(true)}
								>
									Change
								</Button>
							) : null}
						</div>

						{editingEmail ? (
							<form onSubmit={handleEmailUpdate} className="mt-6 space-y-4">
								<div className="space-y-2">
									<label htmlFor="verification-email" className="text-sm font-medium text-high-emphasis">
										Email address
									</label>
									<Input
										id="verification-email"
										type="email"
										name="email"
										value={email}
										onChange={(event) => {
											setEmail(event.target.value);
											setEmailError(null);
										}}
										autoComplete="email"
										spellCheck={false}
										aria-invalid={Boolean(emailError)}
										aria-describedby={emailError ? "verification-email-error" : undefined}
										className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
										required
									/>
								</div>

								{emailError ? (
									<p
										id="verification-email-error"
										role="alert"
										className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5 text-sm text-red-text"
									>
										{emailError}
									</p>
								) : null}

								<div className="flex flex-col-reverse gap-2 sm:flex-row">
									<Button
										type="button"
										variant="outline"
										className="h-10 sm:flex-1"
										disabled={updatingEmail}
										onClick={() => {
											setEmail(user.email);
											setEditingEmail(false);
										}}
									>
										Cancel
									</Button>
									<Button type="submit" className="h-10 sm:flex-1" disabled={updatingEmail}>
										{updatingEmail ? "Updating…" : "Update and resend"}
									</Button>
								</div>
							</form>
						) : (
							<div className="mt-6">
								<p className="text-sm text-medium-emphasis">
									Didn&apos;t receive it? Check your spam folder or send another email.
								</p>
								<Button
									className="mt-4 h-11 w-full"
									onClick={handleResend}
									disabled={resending || resendAt !== null}
								>
									{resending
										? "Sending…"
										: countdown > 0
											? `Resend in ${countdown}s`
											: "Resend email"}
								</Button>
							</div>
						)}
					</div>
				) : null}

				{!user && !verified ? (
					<Button asChild size="lg" className="mt-8 h-11 w-full">
						<Link to="/login" state={{ returnTo }}>Sign in</Link>
					</Button>
				) : null}
			</div>
		</AuthShell>
	);
}
