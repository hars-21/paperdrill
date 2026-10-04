import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteBehavior() {
	const { pathname } = useLocation();

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			window.scrollTo({ top: 0, left: 0, behavior: "auto" });
			document.getElementById("main-content")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
		});

		return () => window.cancelAnimationFrame(frame);
	}, [pathname]);

	return null;
}
