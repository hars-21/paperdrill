import { useState } from "react";
import { Button } from "../ui/button";
import { Rocket, X } from "lucide-react";
import { Link } from "react-router-dom";

const AnnouncementBar = () => {
	const [dismissed, setDismissed] = useState(
		sessionStorage.getItem("bar-dismissed") == "true" ? true : false,
	);

	if (dismissed) return null;

	return (
		<div className="relative flex min-h-9 w-full items-center justify-center gap-2 bg-l3 py-2 pl-4 pr-11 text-xs text-high-emphasis">
			<span className="hidden sm:inline">
				<Rocket className="size-3.5 text-red-text" />
			</span>
			<span>
				<strong>PaperDrill Beta v0.2</strong>
				<span className="hidden sm:inline"> is live - real matching engine, real order book.</span>
				<span className="sm:hidden"> is live.</span>{" "}
				<Link to="/signup" className="font-medium text-primary hover:underline">
					Get started
				</Link>
			</span>
			<Button
				variant="icon"
				size="icon-sm"
				onClick={() => {
					setDismissed(true);
					sessionStorage.setItem("bar-dismissed", "true");
				}}
				className="absolute right-2"
				aria-label="Dismiss"
			>
				<X className="size-3.5" />
			</Button>
		</div>
	);
};

export default AnnouncementBar;
