import quickStart from "./docs/quick-start.md" with { type: "text" };
import authentication from "./docs/authentication.md" with { type: "text" };
import orders from "./docs/orders.md" with { type: "text" };
import markets from "./docs/markets.md" with { type: "text" };
import trades from "./docs/trades.md" with { type: "text" };
import orderbook from "./docs/orderbook.md" with { type: "text" };
import websocket from "./docs/websocket.md" with { type: "text" };

export type DocPage = {
	title: string;
	slug: string;
	description: string;
	content: string;
};

export const docs: DocPage[] = [
	{
		title: "Quick start",
		slug: "",
		description: "Create an account, place a trade, and make your first API request.",
		content: quickStart,
	},
	{
		title: "Authentication",
		slug: "authentication",
		description: "Authenticate API requests with scoped API keys.",
		content: authentication,
	},
	{
		title: "Orders",
		slug: "orders",
		description: "Create, inspect, and cancel orders.",
		content: orders,
	},
	{
		title: "Markets",
		slug: "markets",
		description: "Discover markets and read current ticker values.",
		content: markets,
	},
	{
		title: "Trades",
		slug: "trades",
		description: "Read recent public trades for a market.",
		content: trades,
	},
	{
		title: "Order book",
		slug: "orderbook",
		description: "Read and maintain a live order book.",
		content: orderbook,
	},
	{
		title: "WebSocket",
		slug: "websocket",
		description: "Subscribe to live public market updates.",
		content: websocket,
	},
];

export function getDoc(slug = "") {
	return docs.find((doc) => doc.slug === slug);
}
