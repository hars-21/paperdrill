import { env } from "../setup/env";
import { waitFor } from "./wait-for";

export interface ApiResponse<T> {
	status: number;
	data: T;
	headers: Headers;
}

export interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details?: Array<{ field?: string; message: string }>;
	};
	requestId: string;
}

export interface AuthUser {
	id: string;
	email: string;
	emailVerified: boolean;
}

interface SignUpResponse {
	token: string | null;
	user: AuthUser;
}

interface CompleteOnboardingInput {
	name: string;
	username: string;
}

export interface OrderInput {
	type: "LIMIT" | "MARKET";
	side: "BUY" | "SELL";
	symbol: string;
	price?: string;
	qty: string;
}

export interface OrderResponse {
	id: string;
	userId?: string;
	symbol: string;
	type?: "LIMIT" | "MARKET";
	side?: "BUY" | "SELL";
	status?: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
	price?: string;
	qty?: string;
	filledQty?: string;
	averagePrice?: string;
}

export type Balances = Record<string, { available: string; locked: string }>;

export interface DailyCreditResponse {
	credited: boolean;
	asset: string;
	amount: string;
	creditDate: string;
	nextEligibleAt: string;
}

export interface PortfolioResponse {
	quoteAsset: string;
	equity: string;
	baselineEquity: string;
	pnl: string;
	pnlPercent: string;
}

export interface BalanceHistoryEntry {
	id: string;
	asset: string;
	available: string;
	locked: string;
	total: string;
	deltaAvailable: string;
	deltaLocked: string;
	deltaTotal: string;
	reason: string;
	referenceId: string | null;
	symbol: string | null;
	occurredAt: string;
}

export interface BalanceHistoryResponse {
	entries: BalanceHistoryEntry[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	assets: Array<{
		asset: string;
		available: string;
		locked: string;
		total: string;
		netChange: string;
		entryCount: number;
		lastChangedAt: string | null;
	}>;
	filtered: {
		entryCount: number;
		netChange: string | null;
	};
}

export interface BalanceSeriesResponse {
	mode: "asset" | "total";
	asset: string | null;
	unit: string;
	precision: number;
	partial: boolean;
	range: string;
	from: string;
	to: string;
	points: Array<{
		at: string;
		available: string;
		locked: string;
		total: string;
	}>;
	current: {
		available: string;
		locked: string;
		total: string;
	} | null;
	change: string;
}

export class ApiClient {
	private cookie: string | undefined;

	async request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
		const headers = new Headers(init.headers);
		if (init.body && !headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}
		if (this.cookie) headers.set("cookie", this.cookie);

		const response = await fetch(`${env.apiBaseUrl}${path}`, { ...init, headers });
		const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
		const setCookies =
			typeof responseHeaders.getSetCookie === "function"
				? responseHeaders.getSetCookie()
				: [responseHeaders.get("set-cookie")].filter((value): value is string => value !== null);
		if (setCookies.length > 0) {
			this.cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ");
		}

		const data = (await response.json()) as T;
		return { status: response.status, data, headers: response.headers };
	}

	signup(email: string, name: string, password: string) {
		return this.request<SignUpResponse>("/api/auth/sign-up/email", {
			method: "POST",
			body: JSON.stringify({ email, name, password }),
		});
	}

	completeOnboarding(input: CompleteOnboardingInput) {
		return this.request<AuthUser>("/v1/users/me/onboarding", {
			method: "POST",
			body: JSON.stringify(input),
		});
	}

	claimInitialCredit() {
		return this.request<{ claimed: boolean; asset: string; amount: string }>(
			"/v1/rewards/initial/claim",
			{ method: "POST" },
		);
	}

	getBalances() {
		return this.request<Balances>("/v1/balances");
	}

	getBalanceHistory(query = "") {
		return this.request<BalanceHistoryResponse>(`/v1/balances/history${query}`);
	}

	getBalanceSeries(query = "") {
		return this.request<BalanceSeriesResponse>(`/v1/balances/history/series${query}`);
	}

	getPortfolio() {
		return this.request<PortfolioResponse>("/v1/portfolio");
	}

	claimDailyCredit() {
		return this.request<DailyCreditResponse>("/v1/rewards/daily/claim", { method: "POST" });
	}

	createOrder(input: OrderInput) {
		return this.request<OrderResponse>("/v1/orders", {
			method: "POST",
			body: JSON.stringify(input),
		});
	}

	cancelOrder(id: string) {
		return this.request<Record<string, unknown>>(`/v1/orders/${id}`, { method: "DELETE" });
	}

	getOrders(query = "") {
		return this.request<OrderResponse[]>(`/v1/orders${query}`);
	}

	getOpenOrders() {
		return this.request<OrderResponse[]>("/v1/orders/open");
	}

	getOrder(id: string) {
		return this.request<OrderResponse | ErrorResponse>(`/v1/orders/${id}`);
	}

	getTrades() {
		return this.request<Record<string, unknown>[]>("/v1/trades");
	}

	getTicker(symbol: string) {
		return this.request<Record<string, unknown>>(`/v1/markets/${symbol}/ticker`);
	}
}

export const publicApi = new ApiClient();

export async function waitForSystemReady() {
	await waitFor(
		() => publicApi.request<Record<string, unknown>>("/v1/markets/BTC_USD/orderbook"),
		(response) => response.status === 200,
		{ description: "backend-to-engine readiness", timeoutMs: 15000, intervalMs: 100 },
	);
}
