import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export function ResetPasswordPage() {
	return (
		<AuthShell>
			<ResetPasswordForm />
		</AuthShell>
	);
}
