import { config } from "./config";
import { log } from "./util";

interface OrderResponse {
	id: string;
	symbol: string;
	side: string;
	type: string;
	status: string;
	price: string | null;
	qty: string;
}

export const MARKET: { pricePrecision: number; qtyPrecision: number } = {
	pricePrecision: 0,
	qtyPrecision: 0,
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${config.baseUrl}/v1${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			"X-Api-Key": config.serviceToken,
			"X-Service-Email": config.serviceEmail,
			...options?.headers,
		},
	});

	try {
		const data = await res.json();
		if (!res.ok) throw new Error((data as any)?.error || `API ${res.status}`);
		return data as T;
	} catch (err) {
		log(`API error: ${err}`);
		throw err;
	}
}

async function getMarkets(): Promise<any[]> {
	const res = await api<{ data: any[] }>("/markets");
	return res.data;
}

export async function initMarket() {
	const markets = await getMarkets();
	const market = markets.find((m: any) => m.symbol === config.market);
	if (!market) throw new Error(`Market ${config.market} not found`);
	MARKET.pricePrecision = market.pricePrecision;
	MARKET.qtyPrecision = market.qtyPrecision;
	log(
		`Market ${config.market} initialized with pricePrecision=${MARKET.pricePrecision}, qtyPrecision=${MARKET.qtyPrecision}`,
	);
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

export async function depositFunds(amount: string, asset: string): Promise<void> {
	await api("/deposits", {
		method: "POST",
		body: JSON.stringify({ amount, asset }),
	});
}
