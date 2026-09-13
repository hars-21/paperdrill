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

export class ApiClient {
	private cookie: string | undefined;

	async request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
		const headers = new Headers(init.headers);
		if (init.body && !headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}
		if (this.cookie) headers.set("cookie", this.cookie);

		const response = await fetch(`${env.apiBaseUrl}${path}`, { ...init, headers });
		const setCookie = response.headers.get("set-cookie");
		if (setCookie) this.cookie = setCookie.split(";", 1)[0];

		const data = (await response.json()) as T;
		return { status: response.status, data, headers: response.headers };
	}

	signup(email: string, name: string, password: string) {
		return this.request<{ id: string; email: string; emailVerified: boolean }>("/v1/auth/signup", {
			method: "POST",
			body: JSON.stringify({ email, name, password }),
		});
	}

	getBalances() {
		return this.request<Balances>("/v1/balances");
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
