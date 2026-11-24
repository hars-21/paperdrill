import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export function ResetPasswordForm() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const navigate = useNavigate();
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();
		setFormError(null);

		if (!token) {
			setFormError("This reset link is missing its token.");
			return;
		}
		if (newPassword.length < 8) {
			setFormError("Password must be at least 8 characters long.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setFormError("Passwords do not match.");
			return;
		}

		setIsLoading(true);
		try {
			const result = await authClient.resetPassword({ newPassword, token });
			if (result.error) {
				setFormError(result.error.message ?? "Could not reset your password.");
				return;
			}

			toast.success("Password updated. You can sign in now.");
			navigate("/login", { replace: true });
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Could not reset your password.");
		} finally {
			setIsLoading(false);
		}
	};

	if (!token) {
		return (
			<div>
				<header>
					<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">
						Reset link unavailable
					</h1>
					<p className="mt-2 text-sm leading-6 text-medium-emphasis">
						Open the link from your email, or request a fresh one.
					</p>
				</header>

				<p className="mt-8 text-sm text-medium-emphasis">
					<Link
						to="/forgot-password"
						className="font-medium text-high-emphasis underline-offset-4 hover:underline"
					>
						Request a new reset link
					</Link>
				</p>
			</div>
		);
	}

	return (
		<div>
			<header>
				<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis">
					Choose a new password
				</h1>
				<p className="mt-2 text-sm leading-6 text-medium-emphasis">
					Use at least 8 characters. This link can only be used once.
				</p>
			</header>

			<form onSubmit={handleSubmit} className="mt-8">
				<FieldGroup className="gap-5">
					<Field className="gap-2">
						<FieldLabel htmlFor="new-password">New password</FieldLabel>
						<Input
							id="new-password"
							type="password"
							placeholder="Enter a new password"
							value={newPassword}
							onChange={(event) => {
								setNewPassword(event.target.value);
								setFormError(null);
							}}
							autoComplete="new-password"
							minLength={8}
							aria-invalid={Boolean(formError)}
							aria-describedby={formError ? "reset-password-error" : undefined}
							className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
							required
						/>
					</Field>

					<Field className="gap-2">
						<FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
						<Input
							id="confirm-password"
							type="password"
							placeholder="Repeat your new password"
							value={confirmPassword}
							onChange={(event) => {
								setConfirmPassword(event.target.value);
								setFormError(null);
							}}
							autoComplete="new-password"
							minLength={8}
							aria-invalid={Boolean(formError)}
							aria-describedby={formError ? "reset-password-error" : undefined}
							className="h-11 rounded-lg bg-l1 px-3.5 shadow-none"
							required
						/>
					</Field>

					<FieldError
						id="reset-password-error"
						className="rounded-lg border border-red-text/20 bg-red-bg/20 px-3 py-2.5"
					>
						{formError}
					</FieldError>

					<Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading}>
						{isLoading ? "Updating password…" : "Update password"}
					</Button>
				</FieldGroup>
			</form>

			<FieldDescription className="mt-8 text-xs leading-5">
				<Link to="/forgot-password" className="font-medium text-high-emphasis underline-offset-4 hover:underline">
					Request a new link
				</Link>
			</FieldDescription>
		</div>
	);
}
