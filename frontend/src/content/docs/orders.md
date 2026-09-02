# Orders

Orders use decimal strings for `price` and `qty`. Sending JSON numbers may be rejected, and values with more precision than the selected market supports are rejected.

Available symbols are `BTC_USD`, `ETH_USD`, and `SOL_USD`.

## Create a limit order

`POST /orders` requires `ORDER_CREATE`.

```bash
curl --request POST https://api.paperdrill.dev/v1/orders \
  --header "Content-Type: application/json" \
  --header "x-api-key: YOUR_API_KEY" \
  --data '{
    "symbol": "SOL_USD",
    "side": "BUY",
    "type": "LIMIT",
    "price": "125.50",
    "qty": "2"
  }'
```

| Field | Values | Required |
| --- | --- | --- |
| `symbol` | `BTC_USD`, `ETH_USD`, `SOL_USD` | Yes |
| `side` | `BUY` or `SELL` | Yes |
| `type` | `LIMIT` | Yes |
| `price` | Positive decimal string | Yes |
| `qty` | Positive decimal string | Yes |

The response reports the result after immediate matching. `averagePrice` is included when the order receives a fill.

```json
{
  "id": "b874d142-22ac-4d6d-a0dc-c4f66e5cd57b",
  "symbol": "SOL_USD",
  "status": "PARTIALLY_FILLED",
  "filledQty": "0.50",
  "averagePrice": "125.25"
}
```

Possible limit-order statuses are `OPEN`, `PARTIALLY_FILLED`, and `FILLED`.

## Create a market order

A market order omits `price` and consumes the best available prices in the order book.

```bash
curl --request POST https://api.paperdrill.dev/v1/orders \
  --header "Content-Type: application/json" \
  --header "x-api-key: YOUR_API_KEY" \
  --data '{
    "symbol": "SOL_USD",
    "side": "BUY",
    "type": "MARKET",
    "qty": "1"
  }'
```

Market orders are not guaranteed to fill completely. If available liquidity is insufficient, the filled portion is kept and the unfilled portion is cancelled. If the book has no liquidity, the request returns an error.

## Get open orders

`GET /orders/open` requires `ORDER_READ` and returns all currently open or partially filled orders for the account.

```bash
curl https://api.paperdrill.dev/v1/orders/open \
  --header "x-api-key: YOUR_API_KEY"
```

The response is an array. It is empty when there are no open orders.

```json
[
  {
    "id": "b874d142-22ac-4d6d-a0dc-c4f66e5cd57b",
    "userId": "5c957761-6407-4ef0-99ac-463d1fc63f70",
    "symbol": "SOL_USD",
    "side": "BUY",
    "type": "LIMIT",
    "status": "OPEN",
    "price": "125.50",
    "qty": "2.00",
    "filledQty": "0.00",
    "createdAt": "2026-09-02T12:00:00.000Z"
  }
]
```

## Get order history

`GET /orders` requires `ORDER_READ`. Results are newest first and default to 10 orders on page 1.

```bash
curl "https://api.paperdrill.dev/v1/orders?symbol=SOL_USD&status=FILLED&limit=10&page=1" \
  --header "x-api-key: YOUR_API_KEY"
```

All query parameters are optional:

| Parameter | Accepted values |
| --- | --- |
| `symbol` | A market symbol |
| `status` | `OPEN`, `PARTIALLY_FILLED`, `FILLED`, `CANCELLED` |
| `limit` | Positive integer |
| `page` | Positive integer |

The response uses the same order shape as open orders. Completed orders can take a few seconds to appear in history while exchange events are persisted.

## Cancel an order

`DELETE /orders/:orderId` requires `ORDER_CANCEL`. Only an open or partially filled order owned by the API-key account can be cancelled.

```bash
curl --request DELETE https://api.paperdrill.dev/v1/orders/ORDER_ID \
  --header "x-api-key: YOUR_API_KEY"
```

The response identifies the cancelled quantity and any portion that had already filled.

```json
{
  "id": "b874d142-22ac-4d6d-a0dc-c4f66e5cd57b",
  "symbol": "SOL_USD",
  "qty": "2.00",
  "filledQty": "0.00",
  "releasedFunds": null
}
```

Cancelling a filled order or an unknown order returns `400` with an `error` message.
