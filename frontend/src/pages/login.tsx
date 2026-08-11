import { LoginForm } from "@/components/login-form";

export function LoginPage() {
	return (
		<div className="w-full flex-1 flex items-center justify-center px-6">
			<LoginForm className="w-full max-w-sm" />
		</div>
	);
}
