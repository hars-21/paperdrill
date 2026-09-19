# Authentication

Programmable access to PaperDrill uses API keys. Public market-data endpoints do not require authentication.

API base URL:

```text
https://api.paperdrill.dev/v1
```

## Create an API key

Sign in to PaperDrill, open the [API keys dashboard](/dashboard/api-keys), and create a key with only the permissions your integration needs. Copy the complete key when it appears, it is shown only once.

## Send the key

Pass the complete key in the `x-api-key` header:

```bash
curl https://api.paperdrill.dev/v1/orders/open \
  --header "x-api-key: YOUR_API_KEY"
```

Do not use `Authorization: Bearer` and do not add a prefix yourself.

## Permissions

| Scope          | Allows                                |
| -------------- | ------------------------------------- |
| `ACCOUNT_READ` | Read balances and portfolio           |
| `ORDER_READ`   | Read orders and private trade history |
| `ORDER_CREATE` | Place limit and market orders         |
| `ORDER_CANCEL` | Cancel open orders                    |

## Keep keys safe

- Keep keys in server-side environment variables or a secret manager.
- Never embed a key in browser code, mobile applications, or public repositories.
- Use a separate key for each integration and grant only the required scopes.
- Revoke and replace a key immediately if it may have been exposed.

Continue to [Quick start](/docs) to place your first order, or [Errors & limits](/docs/errors) for failure handling and usage limits.
