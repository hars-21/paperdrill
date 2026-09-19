import "dotenv/config";
import * as Sentry from "@sentry/bun";
import { config } from "./config";

Sentry.init({
	dsn: config.sentry.dsn,
	enabled: config.sentry.enabled,
	environment: config.sentry.environment,
	sendDefaultPii: false,
	maxBreadcrumbs: 50,
	initialScope: { tags: { service: "backend" } },
});

export function captureBackendException(
	error: unknown,
	context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
) {
	if (!config.sentry.enabled) return;

	Sentry.withScope((scope) => {
		if (context?.tags) scope.setTags(context.tags);
		if (context?.extra) scope.setExtras(context.extra);
		Sentry.captureException(error);
	});
}

export async function flushSentry(timeoutMs = 2_000) {
	if (!config.sentry.enabled) return true;
	return Sentry.flush(timeoutMs);
}
