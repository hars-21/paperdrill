# Quick start

This workflow uses the programmable API to discover a market, place a limit order, inspect it, and cancel it.

## 1. Create an API key

Open the [API keys dashboard](/dashboard/api-keys) and create a key with:

- `ORDER_READ`
- `ORDER_CREATE`
- `ORDER_CANCEL`

Copy the complete key when it appears. It is shown only once. See [Authentication](/docs/authentication) for safe storage and available permissions.

## 2. Read the market rules

Never hardcode a symbol’s precision. Read it first:

```bash
curl https://api.paperdrill.dev/v1/markets
```

```json
{
	"data": [
		{
			"symbol": "SOL_USD",
			"baseAsset": "SOL",
			"quoteAsset": "USD",
			"pricePrecision": 2,
			"qtyPrecision": 2
		}
	]
}
```

For this market, `price` accepts up to two decimal places and `qty` up to four. Send decimal values as JSON strings.

## 3. Inspect the order book

```bash
curl https://api.paperdrill.dev/v1/markets/SOL_USD/orderbook
```

Choose a buy price below the best ask if you want the order to rest instead of executing immediately.

## 4. Place a limit order

```bash
curl --request POST https://api.paperdrill.dev/v1/orders \
  --header "Content-Type: application/json" \
  --header "x-api-key: YOUR_API_KEY" \
  --data '{
    "symbol": "SOL_USD",
    "side": "BUY",
    "type": "LIMIT",
    "price": "1.00",
    "qty": "1.00"
  }'
```

The response contains the order ID and current status. A limit order can be `OPEN`, `PARTIALLY_FILLED`, or `FILLED` immediately, so always use the returned status.

## 5. Check the order

```bash
curl https://api.paperdrill.dev/v1/orders/open \
  --header "x-api-key: YOUR_API_KEY"
```

If the order is no longer open, query it directly with `GET /orders/ORDER_ID` or inspect order history.

## 6. Cancel an open order

```bash
curl --request DELETE https://api.paperdrill.dev/v1/orders/ORDER_ID \
  --header "x-api-key: YOUR_API_KEY"
```

Continue to [Orders](/docs/orders) for every request and response field, or [WebSocket](/docs/websocket) for live market updates.
