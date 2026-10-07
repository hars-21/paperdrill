import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info.componentStack);
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
					<AlertTriangle className="size-10 text-primary" />
					<div className="space-y-2">
						<h1 className="text-2xl font-bold text-high-emphasis">Something went wrong</h1>
						<p className="text-sm text-medium-emphasis max-w-md">
							An unexpected error occurred. You can try reloading the page or head back home.
						</p>
						{this.state.error && (
							<pre className="mt-3 text-xs text-low-emphasis bg-muted/50 rounded-md p-3 max-w-lg overflow-x-auto text-left">
								{this.state.error.message}
							</pre>
						)}
					</div>
					<div className="flex gap-3">
						<Button
							variant="secondary"
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							Try Again
						</Button>
						<Button asChild>
							<Link to="/">Go home</Link>
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
