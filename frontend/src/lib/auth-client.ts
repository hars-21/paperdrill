import { createAuthClient } from "better-auth/react";
import { config } from "./env";

export const authClient = createAuthClient({
	baseURL: config.apiBaseUrl,
});
