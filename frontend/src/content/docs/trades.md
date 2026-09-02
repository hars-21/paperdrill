# Trades

`GET /markets/:symbol/trades` returns recent public trades for one market. Authentication is not required.

```bash
curl "https://api.paperdrill.dev/v1/markets/SOL_USD/trades?limit=2"
```

`limit` is optional, defaults to 50, and accepts values from 1 to 500. Trades are returned newest first.

```json
[
  {
    "id": "3a96948f-aead-4b4b-93f4-78cc19427eaf",
    "symbol": "SOL_USD",
    "price": "125.50",
    "qty": "1.25",
    "buyOrderId": "64b5d210-5b79-42ec-ab2a-18c66a4f7c6f",
    "sellOrderId": "646c6479-e8a4-44b8-a616-c773c4357a39",
    "buyerId": "24feea42-daa2-4f45-bc08-e974c36760e2",
    "sellerId": "c4e33694-84d5-4ceb-8d7f-02cbecaa8fba",
    "isBuyerMaker": false,
    "createdAt": 1788350400000
  }
]
```

`price` and `qty` are decimal strings. `createdAt` is a Unix timestamp in milliseconds. `isBuyerMaker` is `true` when the resting order was the buy order.

An unknown symbol or invalid limit returns `400` with an `error` message. An active market with no recent trades returns an empty array.

For new trades as they happen, subscribe to `trade:SYMBOL` over [WebSocket](/docs/websocket).
