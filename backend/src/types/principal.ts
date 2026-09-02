import type { Scope } from "../../generated/prisma/enums";

export const API_KEY_PREFIX = "pdk_";

export type PrincipalType = "session" | "api_key" | "service";

export interface Principal {
	type: PrincipalType;
	userId?: string;
	keyId?: string;
	scopes?: Scope[];
	emailVerified?: boolean;
}
