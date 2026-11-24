import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();
		setFormError(null);
		if (!email.trim()) {
			setFormError("Enter your email address.");
			return;
		}

		setIsLoading(true);
		try {
			const result = await authClient.requestPasswordReset({
				email: email.trim(),
				redirectTo: `${window.location.origin}/reset-password`,
			});

			if (result.error) {
				setFormError(result.error.message ?? "Could not send a reset link.");
				return;
			}

			setSubmitted(true);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Could not send a reset link.");
		} finally {
			setIsLoading(false);
		}
	};

	if (submitted) {
		return (
			<div>
				<header>
					<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">
						Check your email
					</h1>
					<p className="mt-2 text-sm leading-6 text-medium-emphasis">
						If an account exists for <span className="text-high-emphasis">{email.trim()}</span>, a reset
						link is on its way.
					</p>
				</header>

				<FieldDescription className="mt-8 border-t border-border/50 pt-6 text-sm leading-6">
					The link expires in one hour. If you do not see it, check your spam folder or{" "}
					<button
						type="button"
						onClick={() => {
							setSubmitted(false);
							setFormError(null);
						}}
						className="font-medium text-high-emphasis underline-offset-4 hover:underline"
					>
						try again
					</button>
					.
				</FieldDescription>

				<p className="mt-6 text-sm text-medium-emphasis">
					<Link to="/login" className="font-medium text-high-emphasis underline-offset-4 hover:underline">
						Back to sign in
					</Link>
				</p>
			</div>
		);
	}

	return (
		<div>
			<header>
				<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">
					Reset your password
				</h1>
				<p className="mt-2 text-sm leading-6 text-medium-emphasis">
					Enter your email and we will send you a one-time reset link.
				</p>
			</header>

			<form onSubmit={handleSubmit} className="mt-8">
				<FieldGroup className="gap-5">
					<Field className="gap-2">
						<FieldLabel htmlFor="reset-request-email">Email address</FieldLabel>
						<Input
							id="reset-request-email"
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
							aria-describedby={formError ? "reset-request-error" : undefined}
							className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
							required
						/>
					</Field>

					<FieldError
						id="reset-request-error"
						className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5"
					>
						{formError}
					</FieldError>

					<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading}>
						{isLoading ? "Sending reset link…" : "Send reset link"}
					</Button>
				</FieldGroup>
			</form>

			<p className="mt-7 border-t border-border/50 pt-6 text-sm text-medium-emphasis">
				Remembered it?{" "}
				<Link to="/login" className="font-medium text-high-emphasis underline-offset-4 hover:underline">
					Back to sign in
				</Link>
			</p>
		</div>
	);
}
