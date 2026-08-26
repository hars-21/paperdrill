export type UserData = {
	id: string;
	email: string;
	name: string;
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
	isBuyerMaker: boolean;
	buyOrderId: string;
	sellOrderId: string;
	buyerId: string;
	sellerId: string;
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
	id: string;
	status: string;
	qty: string;
	filledQty: string;
	releasedFunds: string;
};
