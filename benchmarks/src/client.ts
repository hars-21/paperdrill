import { config } from "./config";

export interface OrderInput {
	type: "LIMIT" | "MARKET";
	side: "BUY" | "SELL";
	symbol: string;
	price?: string;
	qty: string;
}

export interface OrderResponse {
	id?: string;
	status?: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
	filledQty?: string;
	error?: string;
}

export class ServiceClient {
	constructor(private readonly email: string) {}

	private headers() {
		return {
			"content-type": "application/json",
			"x-api-key": config.serviceToken,
			"x-service-email": this.email,
		};
	}

	async deposit(asset: string, amount: string) {
		const response = await fetch(`${config.apiUrl}/v1/deposits`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ asset, amount }),
		});

		if (!response.ok) {
			throw new Error(`Deposit failed for ${this.email}: ${response.status} ${await response.text()}`);
		}
	}

	async createOrder(input: OrderInput): Promise<{ ok: boolean; data: OrderResponse }> {
		const response = await fetch(`${config.apiUrl}/v1/orders`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify(input),
		});
		const data = (await response.json()) as OrderResponse;
		return { ok: response.ok, data };
	}
}

export async function assertHealthy() {
	const response = await fetch(`${config.apiUrl}/health`);
	if (!response.ok) throw new Error(`Backend health check failed with ${response.status}`);
}
