import { config } from "./config";

interface DepthResponse {
	symbol: string;
	bids: { price: string; qty: string }[];
	asks: { price: string; qty: string }[];
}

interface OrderResponse {
	id: string;
	symbol: string;
	side: string;
	type: string;
	status: string;
	price: string | null;
	qty: string;
}

let cookie = "";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${config.baseUrl}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Cookie: cookie,
			"X-Service": "true",
			...options?.headers,
		},
	});

	const data = await res.json();
	if (!res.ok) throw new Error((data as any)?.error || `API ${res.status}`);
	return data as T;
}

export async function signin() {
	const res = await fetch(`${config.baseUrl}/signin`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Service": "true" },
		body: JSON.stringify({ email: config.email, password: config.password }),
	});

	if (!res.ok) throw new Error(`Signin failed: ${res.status}`);

	const setCookie = res.headers.get("set-cookie");
	cookie = setCookie?.split(";")[0] ?? "";
}

export async function getMarkets(): Promise<any[]> {
	const res = await api<{ data: any[] }>("/markets");
	return res.data;
}

export async function getDepth(): Promise<DepthResponse> {
	return api(`/markets/${config.market}/depth`);
}

export async function getOpenOrders(): Promise<OrderResponse[]> {
	return api("/orders/open");
}

export async function placeOrder(
	side: "BUY" | "SELL",
	type: "LIMIT" | "MARKET",
	price: string | null,
	qty: string,
): Promise<OrderResponse> {
	return api("/orders", {
		method: "POST",
		body: JSON.stringify({ type, side, symbol: config.market, price, qty }),
	});
}

export async function cancelOrder(orderId: string): Promise<void> {
	await api(`/orders/${orderId}`, { method: "DELETE" });
}
