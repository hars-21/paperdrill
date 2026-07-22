import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function SignupPage() {
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { refreshUser } = useAuth();
	const navigate = useNavigate();

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim() || !name.trim() || !password.trim()) {
			toast.error("Please fill in all fields");
			return;
		}
		if (!acceptedTerms) {
			toast.error("You must accept the terms and privacy policy");
			return;
		}

		setIsLoading(true);

		try {
			await api.signup(email, name, password);
			await refreshUser();
			toast.success("Account created successfully");
			navigate("/markets");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Signup failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-center text-lg">Create your account</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSignup} className="space-y-4">
					<div className="space-y-2">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Choose a name"
							/>
						</div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter your email"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Create a password"
						/>
					</div>
					<div className="flex items-start gap-2 pt-1">
						<Checkbox
							id="terms"
							checked={acceptedTerms}
							onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
							className="mt-0.5"
						/>
						<Label
							htmlFor="terms"
							className="text-xs text-muted-foreground font-normal leading-relaxed"
						>
							I accept the{" "}
							<Link to="/terms" className="text-primary hover:underline">
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link to="/privacy" className="text-primary hover:underline">
								Privacy Policy
							</Link>
						</Label>
					</div>
					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? "Creating account..." : "Create Account"}
					</Button>
				</form>
				<p className="mt-4 text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link to="/login" className="text-primary hover:underline">
						Log in
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
