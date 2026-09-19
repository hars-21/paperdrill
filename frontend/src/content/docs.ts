import quickStart from "./docs/quick-start.md" with { type: "text" };
import authentication from "./docs/authentication.md" with { type: "text" };
import orders from "./docs/orders.md" with { type: "text" };
import markets from "./docs/markets.md" with { type: "text" };
import trades from "./docs/trades.md" with { type: "text" };
import orderbook from "./docs/orderbook.md" with { type: "text" };
import websocket from "./docs/websocket.md" with { type: "text" };
import account from "./docs/account.md" with { type: "text" };
import errors from "./docs/errors.md" with { type: "text" };
import apiReference from "./docs/api-reference.md" with { type: "text" };

export type DocPage = {
	title: string;
	slug: string;
	description: string;
	section: string;
	content: string;
};

export const docs: DocPage[] = [
	{
		title: "Quick start",
		slug: "",
		description: "Create an API key and place your first order.",
		section: "Get started",
		content: quickStart,
	},
	{
		title: "Authentication",
		slug: "authentication",
		description: "Authenticate API requests with scoped API keys.",
		section: "Get started",
		content: authentication,
	},
	{
		title: "Orders",
		slug: "orders",
		description: "Create, inspect, and cancel orders.",
		section: "Trading API",
		content: orders,
	},
	{
		title: "Markets",
		slug: "markets",
		description: "Discover markets and read current ticker values.",
		section: "Market data",
		content: markets,
	},
	{
		title: "Trades",
		slug: "trades",
		description: "Read recent public trades for a market.",
		section: "Market data",
		content: trades,
	},
	{
		title: "Order book",
		slug: "orderbook",
		description: "Read and maintain a live order book.",
		section: "Market data",
		content: orderbook,
	},
	{
		title: "WebSocket",
		slug: "websocket",
		description: "Subscribe to live public market updates.",
		section: "Market data",
		content: websocket,
	},
	{
		title: "Account & portfolio",
		slug: "account",
		description: "Read balances, portfolio performance, and your trade history.",
		section: "Account API",
		content: account,
	},
	{
		title: "Errors & limits",
		slug: "errors",
		description: "Handle errors, validation failures, and rate limits.",
		section: "Reference",
		content: errors,
	},
	{
		title: "API reference",
		slug: "api-reference",
		description: "The complete REST endpoint list for v1.",
		section: "Reference",
		content: apiReference,
	},
];

export function getDoc(slug = "") {
	return docs.find((doc) => doc.slug === slug);
}
