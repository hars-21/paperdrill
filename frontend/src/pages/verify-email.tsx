import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import { config } from "@/lib/env";
import { getSafeReturnTo, type ReturnLocationState } from "@/lib/redirect";
import { toast } from "sonner";

type Status = "waiting" | "verifying" | "success" | "error";

export function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const { user, verified, authenticated, loading, needsOnboarding, refreshUser } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const locationState = location.state as ReturnLocationState | null;
	const emailWasJustSent = Boolean(locationState?.emailSent);
	const returnTo = getSafeReturnTo(location.state);
	const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
	const [verificationError, setVerificationError] = useState<string | null>(null);
	const [resending, setResending] = useState(false);
	const [resendAt, setResendAt] = useState<number | null>(() =>
		emailWasJustSent ? Date.now() + 30_000 : null,
	);
	const [countdown, setCountdown] = useState(emailWasJustSent ? 30 : 0);
	const attemptedToken = useRef<string | null>(null);

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
		if (!token || loading || verified || attemptedToken.current === token) return;
		attemptedToken.current = token;
		let active = true;

		const verify = async () => {
			try {
				const response = await fetch(
					`${config.apiBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(returnTo)}`,
					{ credentials: "include" },
				);

				if (!response.ok) {
					let message = "This verification link is invalid or has expired.";
					try {
						const data = (await response.json()) as { message?: string; error?: { message?: string } };
						message = data.error?.message ?? data.message ?? message;
					} catch {
						// ignore parse errors
					}
					throw new Error(message);
				}

				if (!active) return;
				await authClient.getSession();
				await refreshUser();
				setStatus("success");
				toast.success("Email verified successfully");
			} catch (error) {
				if (!active) return;
				setStatus("error");
				setVerificationError(error instanceof Error ? error.message : "Email verification failed.");
			}
		};

		void verify();

		return () => {
			active = false;
		};
	}, [loading, refreshUser, returnTo, token, verified]);

	useEffect(() => {
		if (!verified) return;
		const destination = needsOnboarding ? "/onboarding" : returnTo;
		const timer = window.setTimeout(
			() => navigate(destination, { replace: true, state: { returnTo } }),
			800,
		);
		return () => window.clearTimeout(timer);
	}, [needsOnboarding, navigate, returnTo, verified]);

	const handleResend = async () => {
		const email = user?.email;
		if (!email || resending || resendAt) return;
		setResending(true);
		try {
			const callbackURL = new URL("/verify-email", window.location.origin).toString();
			const result = await authClient.sendVerificationEmail({ email, callbackURL });
			if (result.error) throw new Error(result.error.message ?? "Failed to resend verification email");

			setResendAt(Date.now() + 30_000);
			setCountdown(30);
			setStatus("waiting");
			setVerificationError(null);
			toast.success("Verification email sent");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to resend verification email");
		} finally {
			setResending(false);
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
						Checking your verification status. This should only take a moment.
					</p>
				</div>
			</AuthShell>
		);
	}

	const verificationComplete = verified || status === "success";
	const heading = verificationComplete
		? "Email verified"
		: status === "error"
			? "Verification failed"
			: "Check your inbox";
	const description = verificationComplete
		? "Your email is verified. Continuing to PaperDrill."
		: status === "error"
			? verificationError ?? "This verification link is invalid or has expired."
			: authenticated && user
				? `Open the verification email we sent to ${user.email} to continue.`
				: "Sign in to verify your email and continue.";

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

				{authenticated && user && !verificationComplete ? (
					<div className="mt-8 space-y-4">
						<p className="text-sm text-medium-emphasis">
							Didn&apos;t receive it? Check your spam folder or send another email.
						</p>
						<Button
							className="h-11 w-full"
							onClick={() => void handleResend()}
							disabled={resending || resendAt !== null}
						>
							{resending ? "Sending…" : countdown > 0 ? `Resend in ${countdown}s` : "Resend email"}
						</Button>
					</div>
				) : null}

				{!authenticated && !verificationComplete ? (
					<Button asChild size="lg" className="mt-8 h-11 w-full">
						<Link to="/login" state={{ returnTo }}>
							Sign in
						</Link>
					</Button>
				) : null}

				{verificationComplete ? (
					<p className="mt-8 text-sm text-medium-emphasis">Redirecting…</p>
				) : null}
			</div>
		</AuthShell>
	);
}
