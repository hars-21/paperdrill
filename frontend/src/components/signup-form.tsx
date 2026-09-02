import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const { setUser } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters long");
			return;
		}

		setIsLoading(true);
		try {
			const { message, ...user } = await api.signup(email.trim(), name.trim(), password);
			setUser(user);
			toast.success(message);
			navigate("/verify-email", { state: { emailSent: true } });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Signup failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Create your account</CardTitle>
					<CardDescription>Verify your email before you start trading</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup className="gap-5">
							<Field>
								<FieldLabel htmlFor="name">Full name</FieldLabel>
								<Input
									id="name"
									type="text"
									placeholder="John Doe"
									value={name}
									onChange={(event) => setName(event.target.value)}
									autoComplete="name"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="signup-email">Email</FieldLabel>
								<Input
									id="signup-email"
									type="email"
									placeholder="johndoe@example.com"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									autoComplete="email"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="signup-password">Password</FieldLabel>
								<Input
									id="signup-password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									autoComplete="new-password"
									minLength={8}
									required
								/>
								<FieldDescription>Use at least 8 characters.</FieldDescription>
							</Field>
							<Field>
								<Button type="submit" className="w-full" disabled={isLoading}>
									{isLoading ? "Creating account..." : "Create account"}
								</Button>
								<FieldDescription className="text-center">
									Already have an account? <Link to="/login">Sign in</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and{" "}
				<Link to="/privacy">Privacy Policy</Link>.
			</FieldDescription>
		</div>
	);
}
