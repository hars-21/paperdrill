declare const __API_BASE_URL__: string | undefined;
declare const __WS_URL__: string | undefined;

function readRuntimeEnv(key: string): string | undefined {
	if (typeof process === "undefined" || !process.env) return undefined;
	return process.env[key] ?? process.env[`BUN_PUBLIC_${key}`];
}

function readEnv(key: string, fallback: string): string {
	const val =
		typeof __API_BASE_URL__ !== "undefined" && key === "API_BASE_URL"
			? __API_BASE_URL__
			: typeof __WS_URL__ !== "undefined" && key === "WS_URL"
				? __WS_URL__
				: readRuntimeEnv(key);

	if (
		val &&
		!val.startsWith("http://") &&
		!val.startsWith("ws://") &&
		!val.startsWith("https://") &&
		!val.startsWith("wss://")
	) {
		throw new Error(`Invalid ${key}: must be a valid URL`);
	}

	return val ?? fallback;
}

export const config = {
	apiBaseUrl: readEnv("API_BASE_URL", "http://localhost:8000"),
	wsUrl: readEnv("WS_URL", "ws://localhost:8000"),
} as const;
