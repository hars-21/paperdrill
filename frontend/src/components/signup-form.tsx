import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const { refreshUser } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!name.trim() || !email.trim() || !password.trim()) {
			toast.error("Please fill in all fields");
			return;
		}
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters long");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		setIsLoading(true);
		try {
			await api.signup(email, name, password);
			await refreshUser();
			toast.success("Account created successfully");
			navigate("/markets");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Signup failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Create your account</CardTitle>
					<CardDescription>Start trading with paper money</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="name">Full Name</FieldLabel>
								<Input
									id="name"
									type="text"
									placeholder="John Doe"
									value={name}
									onChange={(e) => setName(e.target.value)}
									autoComplete="name"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="johndoe@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoComplete="email"
									required
								/>
							</Field>
							<Field>
								<Field className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="password">Password</FieldLabel>
										<Input
											id="password"
											type="password"
											placeholder="•••••"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											autoComplete="new-password"
											required
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
										<Input
											id="confirm-password"
											type="password"
											placeholder="•••••"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											autoComplete="new-password"
											required
										/>
									</Field>
								</Field>
								<FieldDescription>Must be at least 8 characters long.</FieldDescription>
							</Field>
							<Field>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? "Creating account..." : "Create Account"}
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
