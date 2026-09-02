import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Status = "waiting" | "verifying" | "success" | "error";

export function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const { user, verified, loading, refreshUser } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const emailWasJustSent = Boolean((location.state as { emailSent?: boolean } | null)?.emailSent);
	const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
	const [resending, setResending] = useState(false);
	const [resendAt, setResendAt] = useState<number | null>(() =>
		emailWasJustSent ? Date.now() + 30_000 : null,
	);
	const [countdown, setCountdown] = useState(emailWasJustSent ? 30 : 0);

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
	}, [token, loading, verified]);

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
			toast.success(result.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to resend verification email");
		} finally {
			setResending(false);
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
		<div className="flex w-full flex-1 items-center justify-center px-6">
			<Card className="w-full max-w-sm px-4 py-10">
				<CardHeader className="text-left">
					<CardTitle className="text-xl pb-4">
						{verified
							? "Email verified"
							: status === "error"
								? "Verification failed"
								: "Check your inbox"}
					</CardTitle>
					<CardDescription>
						{verified ? (
							"Your email has been successfully verified. Redirecting to the markets page..."
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
					{user && !verified && (
						<>
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
