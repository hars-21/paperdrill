function positiveInteger(name: string, fallback: number): number {
	const value = Number(process.env[name] ?? fallback);
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
	return value;
}

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required`);
	return value;
}

if (process.env.NODE_ENV !== "test") {
	throw new Error("Benchmarks only run against the isolated test environment");
}

export const config = {
	apiUrl: required("API_URL").replace(/\/$/, ""),
	wsUrl: required("WS_URL").replace(/\/$/, ""),
	serviceToken: required("SERVICE_TOKEN"),
	httpConcurrency: positiveInteger("HTTP_CONCURRENCY", 50),
	unmatchedOrders: positiveInteger("UNMATCHED_ORDERS", 10_000),
	matchedOrders: positiveInteger("MATCHED_ORDERS", 5_000),
	sweepOrders: positiveInteger("SWEEP_ORDERS", 1_000),
	websocketConnections: positiveInteger("WS_CONNECTIONS", 500),
	websocketTimeoutMs: positiveInteger("WS_TIMEOUT_MS", 5_000),
};
