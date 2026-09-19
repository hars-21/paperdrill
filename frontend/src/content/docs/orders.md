# Orders

Order requests require a verified account and the relevant API-key scope. `price` and `qty` are positive decimal strings. Read [Markets](/docs/markets) before placing an order so the number of decimal places matches the market.

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
    "qty": "2.00"
  }'
```

| Field    | Values                                      | Required |
| -------- | ------------------------------------------- | -------- |
| `symbol` | A symbol returned by `GET /markets`         | Yes      |
| `side`   | `BUY` or `SELL`                             | Yes      |
| `type`   | `LIMIT`                                     | Yes      |
| `price`  | Positive decimal string at market precision | Yes      |
| `qty`    | Positive decimal string at market precision | Yes      |

## Create a market order

Market orders omit `price` and consume available liquidity.

```json
{
	"symbol": "SOL_USD",
	"side": "BUY",
	"type": "MARKET",
	"qty": "1.00"
}
```

If the book has no liquidity, the API returns `422 NO_LIQUIDITY`. A market order may also be partially filled; inspect the response instead of assuming the whole quantity traded.

## Order response

`POST /orders` and `GET /orders/:orderId` return this shape:

```json
{
	"id": "order_123",
	"userId": "user_123",
	"symbol": "SOL_USD",
	"side": "BUY",
	"type": "LIMIT",
	"status": "PARTIALLY_FILLED",
	"price": "125.50",
	"qty": "2.00",
	"filledQty": "0.50",
	"averagePrice": "125.25",
	"createdAt": "2026-09-19T10:00:00.000Z"
}
```

`status` is one of `OPEN`, `PARTIALLY_FILLED`, `FILLED`, or `CANCELLED`. `averagePrice` is omitted until a fill exists.

## Read orders

| Endpoint               | Scope        | Notes                                |
| ---------------------- | ------------ | ------------------------------------ |
| `GET /orders/open`     | `ORDER_READ` | All open and partially filled orders |
| `GET /orders/:orderId` | `ORDER_READ` | One order owned by the caller        |
| `GET /orders`          | `ORDER_READ` | History, newest first                |

Order-history query parameters are all optional:

| Parameter | Values                                            |
| --------- | ------------------------------------------------- |
| `symbol`  | Market symbol                                     |
| `status`  | `OPEN`, `PARTIALLY_FILLED`, `FILLED`, `CANCELLED` |
| `limit`   | Positive integer; defaults to 10                  |
| `page`    | Positive integer; defaults to 1                   |

```bash
curl "https://api.paperdrill.dev/v1/orders?symbol=SOL_USD&status=FILLED&limit=10&page=1" \
  --header "x-api-key: YOUR_API_KEY"
```

## Cancel an order

`DELETE /orders/:orderId` requires `ORDER_CANCEL`.

```bash
curl --request DELETE https://api.paperdrill.dev/v1/orders/order_123 \
  --header "x-api-key: YOUR_API_KEY"
```

```json
{
	"id": "order_123",
	"symbol": "SOL_USD",
	"status": "CANCELLED",
	"side": "BUY",
	"qty": "2.00",
	"filledQty": "0.50",
	"releasedFunds": "188.25"
}
```

A filled order cannot be cancelled and returns `409 ORDER_NOT_CANCELLABLE`.
