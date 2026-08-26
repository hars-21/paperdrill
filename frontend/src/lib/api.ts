import type { CancelResult, DepthSnapshot, Fill, OrderResult, UserData } from "@/types/api";
import { config } from "./env";
import type { Candle, Market, OrderRecord, UserBalance } from "@/types";

const BASE = `${config.apiBaseUrl}/v1`;

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	try {
		const res = await fetch(`${BASE}${path}`, {
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
			...options,
		});

		let data: Record<string, unknown>;

		try {
			data = await res.json();
		} catch {
			throw new ApiError(`Server returned ${res.status}: ${res.statusText}`, res.status);
		}

		if (!res.ok) {
			const message =
				typeof data?.error === "string"
					? data.error
					: typeof data?.message === "string"
						? data.message
						: `Request failed: ${res.status}`;

			throw new ApiError(message, res.status);
		}

		return data as T;
	} catch (err) {
		if (err instanceof TypeError && err.message === "Failed to fetch") {
			throw new Error("Network error: unable to reach the server");
		}

		throw err;
	}
}

export const api = {
	getCurrentUser() {
		return request<UserData>("/users/me");
	},

	signin(email: string, password: string) {
		return request<{ id: string; name: string; email: string }>("/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
	},

	signup(email: string, name: string, password: string) {
		return request<{ success: boolean; message: string }>("/auth/signup", {
			method: "POST",
			body: JSON.stringify({ email, name, password }),
		});
	},

	verifyEmail(token: string) {
		return request<{ id: string; name: string; email: string }>(
			`/auth/verify-email?token=${encodeURIComponent(token)}`,
			{
				method: "POST",
			},
		);
	},

	resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
		return request<{ success: boolean; message: string }>("/auth/resend-verification-email", {
			method: "POST",
			body: JSON.stringify({ email }),
		});
	},

	signout() {
		return request<{ success: boolean; message: string }>("/auth/logout", {
			method: "POST",
		});
	},

	getMarkets() {
		return request<{ data: Market[] }>("/markets");
	},

	getDepth(symbol: string) {
		return request<DepthSnapshot>(`/markets/${symbol}/orderbook`);
	},

	getTrades(symbol: string, limit?: number) {
		const params = limit ? `?limit=${limit}` : "";
		return request<Fill[]>(`/markets/${symbol}/trades${params}`);
	},

	getCandles(symbol: string, interval: string) {
		return request<{ data: Omit<Candle, "symbol" | "event">[] }>(
			`/markets/${symbol}/candles?interval=${interval}`,
		);
	},

	getBalance(asset?: string) {
		const params = asset ? `?asset=${encodeURIComponent(asset)}` : "";
		return request<UserBalance>(`/balances${params}`);
	},

	getOpenOrders() {
		return request<OrderRecord[]>("/orders/open");
	},

	getOrders(params?: { symbol?: string; status?: string; limit?: number; page?: number }) {
		const q = new URLSearchParams();
		if (params?.symbol) q.set("symbol", params.symbol);
		if (params?.status) q.set("status", params.status);
		if (params?.limit) q.set("limit", String(params.limit));
		if (params?.page) q.set("page", String(params.page));
		const qs = q.toString();
		return request<OrderRecord[]>(`/orders${qs ? `?${qs}` : ""}`);
	},

	createOrder(
		side: "BUY" | "SELL",
		type: "LIMIT" | "MARKET",
		symbol: string,
		qty: string,
		price?: string | null,
	) {
		return request<OrderResult>("/orders", {
			method: "POST",
			body: JSON.stringify({ side, type, symbol, qty, price: price ?? null }),
		});
	},

	cancelOrder(orderId: string) {
		return request<CancelResult>(`/orders/${orderId}`, { method: "DELETE" });
	},
};

export function isUnauthorized(error: unknown): boolean {
	return error instanceof ApiError && error.status === 401;
}
