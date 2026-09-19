# Errors and rate limits

All API errors use the same JSON envelope. Save `requestId` when reporting an issue, it identifies the matching server log.

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Request validation failed",
		"details": [{ "field": "qty", "message": "invalid decimal format" }]
	},
	"requestId": "f4c0baf4-b8d2-4c9a-a17b-c8656c4a7b0e"
}
```

`details` appears only for field-level validation errors. Every response also includes an `X-Request-Id` header.

## Common status codes

| Status | Common codes                                             | What to do                                     |
| ------ | -------------------------------------------------------- | ---------------------------------------------- |
| `400`  | `VALIDATION_ERROR`, `MALFORMED_JSON`                     | Correct the request shape, value, or precision |
| `401`  | `AUTHENTICATION_REQUIRED`, `INVALID_API_KEY`             | Add or replace the API key                     |
| `403`  | `FORBIDDEN`                                              | Add the required scope or use another key      |
| `404`  | `MARKET_NOT_FOUND`, `ORDER_NOT_FOUND`                    | Check the supplied identifier                  |
| `409`  | `ORDER_NOT_CANCELLABLE`                                  | Refresh the order before retrying              |
| `422`  | `INSUFFICIENT_BALANCE`, `NO_LIQUIDITY`, `ORDER_REJECTED` | Adjust the order or wait for liquidity         |
| `429`  | `RATE_LIMITED`                                           | Wait for the current window to reset           |
| `503`  | `SERVICE_UNAVAILABLE`, `PORTFOLIO_UNAVAILABLE`           | Retry with exponential backoff                 |
| `504`  | `ENGINE_TIMEOUT`                                         | Check order history before retrying            |

## API-key rate limits

Limits are tracked independently for each API key.

| Bucket          | Allowed usage           | Applies to                                   |
| --------------- | ----------------------- | -------------------------------------------- |
| General API     | 600 requests per minute | Every REST request made with the key         |
| Order mutations | 30 requests per minute  | `POST /orders` and `DELETE /orders/:orderId` |

An order mutation counts against both buckets. Successful responses include standard rate-limit headers describing the current policy and remaining allowance. Limits may change to protect platform stability.

For sustained usage above these limits, contact [support@paperdrill.dev](mailto:support@paperdrill.dev) with your expected request rate and use case.

## Retry safely

- Retry read requests after `429`, `503`, or `504` with exponential backoff and jitter.
- Do not blindly retry order creation after a timeout; check order history first to avoid duplicates.
- Order cancellation is safe to retry after a network failure, but a filled order can no longer be cancelled.
