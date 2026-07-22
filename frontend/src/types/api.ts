import type { UserBalance } from ".";

export type UserData = {
	userId: string;
	email: string;
	name: string;
	balance: UserBalance;
};

export type OrderResult = {
	id: string;
	status: string;
	filledQty: string;
	averagePrice: string | null;
	fills: Fill[];
};

export type Fill = {
	id: string;
	symbol: string;
	price: string;
	qty: string;
	side: "BUY" | "SELL";
	buyOrderId: string;
	sellOrderId: string;
	buyerId: string;
	sellerId: string;
	createdAt: string;
};

export type DepthSnapshot = {
	symbol: string;
	bids: { price: string; qty: string }[];
	asks: { price: string; qty: string }[];
	lastUpdateId: number;
	timestamp: number;
};

export type CancelResult = {
	id: string;
	status: string;
	qty: string;
	filledQty: string;
	releasedFunds: string;
};
