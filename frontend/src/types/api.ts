import type { UserBalance } from ".";

export type UserData = {
	userId: string;
	email: string;
	name: string;
	balance: UserBalance;
};

export type OrderResult = {
	orderId: string;
	status: string;
	filledQty: string;
	averagePrice: string | null;
	fills: Fill[];
};

export type Fill = {
	fillId: string;
	symbol: string;
	price: string;
	qty: string;
	buyOrderId: string;
	sellOrderId: string;
	isBuyerMaker: boolean;
	createdAt: number;
};

export type DepthSnapshot = {
	symbol: string;
	bids: { price: string; qty: string }[];
	asks: { price: string; qty: string }[];
	lastUpdateId: number;
	timestamp: number;
};

export type CancelResult = {
	orderId: string;
	status: string;
	qty: string;
	filledQty: string;
	releasedFunds: string;
};
