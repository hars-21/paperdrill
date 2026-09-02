# Authentication

The API base URL is:

```text
https://api.paperdrill.dev/v1
```

Create a key from [API keys](/dashboard/api-keys) and send the complete key in the `x-api-key` header on every account or order request.

```bash
curl https://api.paperdrill.dev/v1/orders/open \
  --header "x-api-key: YOUR_API_KEY"
```

Do not include `Bearer` before the key. Public market-data endpoints do not require authentication.

## Permissions

| Permission | Allows |
| --- | --- |
| `ACCOUNT_READ` | Read balances |
| `ORDER_READ` | Read orders and trade history |
| `ORDER_CREATE` | Place limit and market orders |
| `ORDER_CANCEL` | Cancel open orders |

Permissions are checked for each request. Only grant the permissions the client needs.

## Key handling

- The secret is shown only when the key is created.
- PaperDrill stores a hash and cannot show the secret again.
- Revoking a key takes effect immediately.
- Create a new key if the original is lost or exposed.

## Errors

| Status | Meaning |
| --- | --- |
| `401` | The key is missing, malformed, invalid, or revoked |
| `403` | The key is valid but lacks the required permission |
| `429` | Too many requests were sent in a short period |

Errors are returned as JSON:

```json
{
  "error": "You do not have permission to perform this action"
}
```
