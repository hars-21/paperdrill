import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const { setUser } = useAuth();
	const navigate = useNavigate();

	const [status, setStatus] = useState<"loading" | "success" | "no-token" | "api-error">("loading");

	useEffect(() => {
		if (!token) {
			setStatus("no-token");
			return;
		}

		let cancelled = false;

		(async () => {
			try {
				const user = await api.verifyEmail(token);
				setUser(user);
				if (!cancelled) setStatus("success");
			} catch (err) {
				if (!cancelled) {
					setStatus("api-error");
					toast.error(
						err instanceof Error ? err.message : "An error occurred while verifying your email.",
					);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [token, setUser]);

	useEffect(() => {
		if (status === "success") {
			const id = setTimeout(() => navigate("/markets"), 1500);
			return () => clearTimeout(id);
		}
	}, [status, navigate]);

	return (
		<div className="flex w-full flex-1 items-center justify-center px-6">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader className="pb-4">
						{status === "loading" && (
							<>
								<CardTitle className="text-2xl tracking-tight">Verifying your email</CardTitle>
								<CardDescription className="mt-2">
									We&apos;re confirming your email address. This will only take a moment.
								</CardDescription>
							</>
						)}

						{status === "success" && (
							<>
								<CardTitle className="text-2xl tracking-tight">You&apos;re all set</CardTitle>
								<CardDescription className="mt-2">
									Your email has been verified successfully. Redirecting you shortly.
								</CardDescription>
							</>
						)}

						{status === "no-token" && (
							<>
								<CardTitle className="text-2xl tracking-tight">Unable to verify</CardTitle>
								<CardDescription className="mt-2">
									We&apos;re unable to process your verification request. Please try signing in and
									request a new verification email.
								</CardDescription>
							</>
						)}

						{status === "api-error" && (
							<>
								<CardTitle className="text-2xl tracking-tight">Verification failed</CardTitle>
								<CardDescription className="mt-2">
									This verification link is invalid or has expired. Please sign in and request a new
									one.
								</CardDescription>
							</>
						)}
					</CardHeader>

					<CardContent>
						{status === "loading" && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Verifying your account...</span>
							</div>
						)}

						{status === "success" && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Redirecting to markets...</span>
							</div>
						)}

						{(status === "no-token" || status === "api-error") && (
							<Link to="/login" className="block">
								<Button className="w-full">Sign in</Button>
							</Link>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
