import { SignupForm } from "@/components/signup-form";

export function SignupPage() {
	return (
		<div className="flex w-full flex-1 items-center justify-center px-4 py-6 sm:px-6">
			<SignupForm className="w-full max-w-sm" />
		</div>
	);
}
