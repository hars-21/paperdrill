export type ReturnLocationState = {
	returnTo?: string;
	emailSent?: boolean;
};

export function getSafeReturnTo(state: unknown, fallback = "/dashboard") {
	if (!state || typeof state !== "object" || !("returnTo" in state)) return fallback;

	const returnTo = (state as ReturnLocationState).returnTo;
	if (
		typeof returnTo !== "string" ||
		!returnTo.startsWith("/") ||
		returnTo.startsWith("//") ||
		returnTo.includes("\\")
	) {
		return fallback;
	}

	return returnTo;
}
