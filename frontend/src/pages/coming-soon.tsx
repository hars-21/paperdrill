import { Link } from "react-router-dom";

export function ComingSoon({ title, description }: { title: string; description: string }) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
			<h1 className="text-xl font-semibold text-high-emphasis">{title}</h1>
			<p className="max-w-sm text-sm text-medium-emphasis">{description}</p>
			<Link to="/" className="mt-2 text-sm font-medium text-primary hover:underline">
				Back to Home
			</Link>
		</div>
	);
}
