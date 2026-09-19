import { usePostHog } from "@posthog/react";

const disabledAnalytics = {
	capture: () => undefined,
	identify: () => undefined,
	reset: () => undefined,
};

const analyticsEnabled = process.env.NODE_ENV === "production";

export function useAnalytics() {
	const posthog = usePostHog();
	return analyticsEnabled ? posthog : disabledAnalytics;
}

export { analyticsEnabled };
