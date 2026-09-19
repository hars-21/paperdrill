# Account and portfolio

These endpoints use API-key authentication. Decimal balances and values are returned as strings so clients do not lose precision.

## Read balances

`GET /balances` requires `ACCOUNT_READ`. Add `?asset=USD` to return one asset only.

```bash
curl https://api.paperdrill.dev/v1/balances \
  --header "x-api-key: YOUR_API_KEY"
```

```json
{
	"USD": { "available": "9748.50", "locked": "251.50" },
	"SOL": { "available": "2.00", "locked": "0.00" }
}
```

`available` can be used immediately. `locked` is reserved by open orders.

## Read portfolio performance

`GET /portfolio` requires `ACCOUNT_READ`. It values each position in the platform quote asset and compares it with the account’s PnL baseline.

```bash
curl https://api.paperdrill.dev/v1/portfolio \
  --header "x-api-key: YOUR_API_KEY"
```

| Field                | Meaning                                          |
| -------------------- | ------------------------------------------------ |
| `equity`             | Current portfolio value                          |
| `baselineEquity`     | Value used as the PnL starting point             |
| `pnl` / `pnlPercent` | Change from the baseline                         |
| `asOf`               | Oldest price timestamp used for valuation        |
| `partial`            | `true` when a position could not be fully priced |
| `positions`          | Per-asset balances, mark price, and value        |

## Read private trade history

`GET /trades?limit=100` requires `ORDER_READ`. `limit` is optional and accepts 1–500.

```bash
curl "https://api.paperdrill.dev/v1/trades?limit=2" \
  --header "x-api-key: YOUR_API_KEY"
```

```json
[
	{
		"id": "fill_123",
		"symbol": "SOL_USD",
		"price": "125.50",
		"qty": "1.25",
		"side": "BUY",
		"isMaker": false,
		"orderId": "order_123",
		"createdAt": "2026-09-19T10:00:00.000Z"
	}
]
```
