import { useState } from "react";
import { Button } from "../ui/button";
import { Rocket, X } from "lucide-react";
import { Link } from "react-router-dom";

const DISMISS_KEY = "announcement-dismissed";

const AnnouncementBar = () => {
	const [dismissed, setDismissed] = useState(sessionStorage.getItem(DISMISS_KEY) === "true");

	if (dismissed) return null;

	return (
		<div className="relative flex min-h-9 w-full items-center justify-center gap-2 bg-l3 py-2 pl-4 pr-11 text-xs text-high-emphasis">
			<span className="hidden sm:inline">
				<Rocket className="size-3.5 text-red-text" />
			</span>
			<span>
				<strong>PaperDrill v0.3.0-beta</strong>
				<span className="hidden sm:inline"> is live with API access, a dashboard and docs.</span>
				<span className="sm:hidden"> is live.</span>{" "}
				<Link to="/changelog" className="font-medium text-primary hover:underline">
					What&apos;s new
				</Link>
			</span>
			<Button
				variant="icon"
				size="icon-sm"
				onClick={() => {
					setDismissed(true);
					sessionStorage.setItem(DISMISS_KEY, "true");
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
