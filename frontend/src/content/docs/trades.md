# Public trades

`GET /markets/:symbol/trades` returns recent public fills for one market. Authentication is not required.

```bash
curl "https://api.paperdrill.dev/v1/markets/SOL_USD/trades?limit=2"
```

`limit` is optional, defaults to 50, and accepts 1–500. Results are newest first.

```json
[
	{
		"id": "fill_123",
		"symbol": "SOL_USD",
		"price": "125.50",
		"qty": "1.25",
		"buyOrderId": "buy_order_123",
		"sellOrderId": "sell_order_123",
		"buyerId": "buyer_123",
		"sellerId": "seller_123",
		"isBuyerMaker": false,
		"createdAt": 1789812000000
	}
]
```

`createdAt` is Unix milliseconds. `isBuyerMaker` is `true` when the resting order was the buy order. An active market with no fills returns an empty array; an unknown market returns `404 MARKET_NOT_FOUND`.

For a user’s own fills, use [Account & portfolio](/docs/account). For real-time public fills, subscribe to `trade:SYMBOL` over [WebSocket](/docs/websocket).
