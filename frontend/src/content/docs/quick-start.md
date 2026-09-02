# Quick start

Follow this workflow to place and cancel your first order through the API.

## 1. Create an account

[Create your account](/signup) and verify your email. API access and trading remain disabled until verification is complete.

## 2. Create an API key

Open [API keys](/dashboard/api-keys), create a key, and select these permissions:

- `ORDER_READ`
- `ORDER_CREATE`
- `ORDER_CANCEL`

Copy the key when it appears. It is shown only once.

## 3. Authenticate

Send the complete key in the `x-api-key` header. See [Authentication](/docs/authentication) for permission and error details.

## 4. Create your first order

This creates a limit order to buy 1 SOL at 1 USD. Decimal values must be JSON strings.

```bash
curl --request POST https://api.paperdrill.dev/v1/orders \
  --header "Content-Type: application/json" \
  --header "x-api-key: YOUR_API_KEY" \
  --data '{
    "symbol": "SOL_USD",
    "side": "BUY",
    "type": "LIMIT",
    "price": "1",
    "qty": "1"
  }'
```

A resting order returns an ID you can use for later requests.

```json
{
  "id": "b874d142-22ac-4d6d-a0dc-c4f66e5cd57b",
  "symbol": "SOL_USD",
  "status": "OPEN",
  "filledQty": "0.00"
}
```

An order may fill immediately if it crosses the order book, so always check `status` instead of assuming it remains open.

## 5. Cancel the order

Replace `ORDER_ID` with the ID returned above.

```bash
curl --request DELETE https://api.paperdrill.dev/v1/orders/ORDER_ID \
  --header "x-api-key: YOUR_API_KEY"
```

Continue to [Orders](/docs/orders) for market orders, open orders, history, and response fields.
