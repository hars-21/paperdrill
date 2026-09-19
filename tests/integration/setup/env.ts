function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required for integration tests`);
	return value;
}

const nodeEnv = required("NODE_ENV");
const databaseUrl = new URL(required("DATABASE_URL"));
const redisUrl = new URL(required("REDIS_URL"));

if (nodeEnv !== "test") {
	throw new Error("Refusing to run integration tests outside the explicit test environment");
}

if (!databaseUrl.pathname.toLowerCase().includes("test")) {
	throw new Error("Refusing to use a database whose name does not contain 'test'");
}

if (redisUrl.protocol !== "redis:" && redisUrl.protocol !== "rediss:") {
	throw new Error("REDIS_URL must use the redis protocol");
}

export const env = {
	apiBaseUrl: required("API_BASE_URL").replace(/\/$/, ""),
	wsUrl: required("WS_URL").replace(/\/$/, ""),
	databaseUrl: databaseUrl.toString(),
	redisUrl: redisUrl.toString(),
	incomingStream: required("INCOMING_STREAM"),
};
