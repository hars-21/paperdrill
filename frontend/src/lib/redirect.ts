export type ReturnLocationState = {
	returnTo?: string;
	emailSent?: boolean;
};

function normalizeReturnTo(value: unknown, fallback: string) {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return fallback;
	}

	return value;
}

export function getSafeReturnTo(state: unknown, fallback = "/home") {
	if (!state || typeof state !== "object" || !("returnTo" in state)) return fallback;

	return normalizeReturnTo((state as ReturnLocationState).returnTo, fallback);
}

export function getSafeReturnToFromLocation(
	location: { state: unknown; search: string },
	fallback = "/home",
) {
	const fromSearch = new URLSearchParams(location.search).get("returnTo");
	if (fromSearch !== null) return normalizeReturnTo(fromSearch, fallback);

	return getSafeReturnTo(location.state, fallback);
}
