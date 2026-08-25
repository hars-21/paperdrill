import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");

	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

	useEffect(() => {
		if (!token) {
			setStatus("error");
			toast.error("No verification token provided.");
			return;
		}

		let cancelled = false;

		api
			.verifyEmail(token)
			.then(() => {
				if (!cancelled) setStatus("success");
			})
			.catch((err) => {
				if (!cancelled) {
					setStatus("error");
					toast.error(err instanceof Error ? err.message : "Verification failed.");
				}
			});

		return () => {
			cancelled = true;
		};
	}, [token]);

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
									Your email has been verified successfully. Your account is ready to use.
								</CardDescription>
							</>
						)}

						{status === "error" && (
							<>
								<CardTitle className="text-2xl tracking-tight">Verification link expired</CardTitle>
								<CardDescription className="mt-2">
									This verification link is no longer valid. Please request a new one to continue.
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
							<div className="space-y-3">
								<Link to="/trade/BTC_USD" className="block">
									<Button className="w-full">Continue to trading</Button>
								</Link>

								<p className="text-center text-xs text-muted-foreground">
									Your account is verified and ready to use.
								</p>
							</div>
						)}

						{status === "error" && (
							<div className="space-y-3">
								<Link to="/signup" className="block">
									<Button className="w-full">Create a new account</Button>
								</Link>

								<Link to="/login" className="block">
									<Button variant="ghost" className="w-full">
										Back to login
									</Button>
								</Link>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
