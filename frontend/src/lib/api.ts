import type { CancelResult, DepthSnapshot, Fill, OrderResult, UserData } from "@/types/api";
import { config } from "./env";
import type { Candle, Market, OrderRecord, UserBalance } from "@/types";

const BASE = config.apiBaseUrl;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	try {
		const res = await fetch(`${BASE}${path}`, {
			credentials: "include",
			headers: { "Content-Type": "application/json", ...options.headers },
			...options,
		});

		let data: Record<string, unknown>;
		try {
			data = await res.json();
		} catch {
			throw new Error(`Server returned ${res.status}: ${res.statusText}`);
		}

		if (!res.ok) {
			const message =
				(typeof data?.error === "string" ? data.error : undefined) ??
				(typeof data?.message === "string" ? data.message : undefined) ??
				`Request failed: ${res.status}`;
			throw new Error(message);
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
	getMe(): Promise<UserData> {
		return request<UserData>("/me");
	},

	signin(email: string, password: string): Promise<{ userId: string; name: string }> {
		return request<{ userId: string; name: string }>("/signin", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
	},

	signup(email: string, name: string, password: string): Promise<{ userId: string; name: string }> {
		return request<{ userId: string; name: string }>("/signup", {
			method: "POST",
			body: JSON.stringify({ email, name, password }),
		});
	},

	signout(): Promise<{ success: boolean; message: string }> {
		return request<{ success: boolean; message: string }>("/signout", {
			method: "POST",
		});
	},

	getMarkets(): Promise<{ data: Market[] }> {
		return request<{ data: Market[] }>("/markets");
	},

	getDepth(symbol: string): Promise<DepthSnapshot> {
		return request<DepthSnapshot>(`/markets/${symbol}/depth`);
	},

	getTrades(symbol: string, limit?: number): Promise<Fill[]> {
		const params = limit ? `?limit=${limit}` : "";
		return request<Fill[]>(`/markets/${symbol}/trades${params}`);
	},

	getCandles(
		symbol: string,
		interval: string,
	): Promise<{ data: Omit<Candle, "symbol" | "event">[] }> {
		return request<{ data: Omit<Candle, "symbol" | "event">[] }>(
			`/markets/${symbol}/candles?interval=${interval}`,
		);
	},

	getBalance(): Promise<UserBalance> {
		return request<UserBalance>("/balances");
	},

	getOpenOrders(): Promise<OrderRecord[]> {
		return request<OrderRecord[]>("/orders/open");
	},

	getOrders(params?: {
		symbol?: string;
		status?: string;
		limit?: number;
		page?: number;
	}): Promise<OrderRecord[]> {
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
	): Promise<OrderResult> {
		return request<OrderResult>("/orders", {
			method: "POST",
			body: JSON.stringify({ side, type, symbol, qty, price: price ?? null }),
		});
	},

	cancelOrder(orderId: string): Promise<CancelResult> {
		return request<CancelResult>(`/orders/${orderId}`, { method: "DELETE" });
	},
};
