import { LoginForm } from "@/components/login-form";

export function LoginPage() {
	return (
		<div className="flex w-full flex-1 items-center justify-center px-4 py-6 sm:px-6">
			<LoginForm className="w-full max-w-sm" />
		</div>
	);
}
