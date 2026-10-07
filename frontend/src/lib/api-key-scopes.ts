import type { ApiKeyScope } from "@/types";

export const API_KEY_SCOPE_OPTIONS: {
	value: ApiKeyScope;
	label: string;
	description: string;
}[] = [
	{
		value: "ACCOUNT_READ",
		label: "Read balances",
		description: "View balances and portfolio information.",
	},
	{
		value: "ORDER_READ",
		label: "Read orders",
		description: "View open orders and trading history.",
	},
	{
		value: "ORDER_CREATE",
		label: "Create orders",
		description: "Place market and limit orders.",
	},
	{
		value: "ORDER_CANCEL",
		label: "Cancel orders",
		description: "Cancel existing open orders.",
	},
];

export const API_KEY_SCOPE_LABELS: Record<ApiKeyScope, string> = {
	ACCOUNT_READ: "Balances",
	ORDER_READ: "Read orders",
	ORDER_CREATE: "Create orders",
	ORDER_CANCEL: "Cancel orders",
};
