# WebSocket

The public WebSocket streams live market updates without authentication.

```text
wss://api.paperdrill.dev
```

## Subscribe

Send a `SUBSCRIBE` message after the connection opens. Multiple channels can be included in one request.

```json
{
  "method": "SUBSCRIBE",
  "params": ["trade:SOL_USD", "depth:SOL_USD", "ticker:SOL_USD"]
}
```

Available channels:

| Channel | Sends |
| --- | --- |
| `trade:SYMBOL` | A completed trade |
| `depth:SYMBOL` | An updated order-book price level |
| `ticker:SYMBOL` | Updated 24-hour market statistics |

The server does not send a subscription acknowledgement. Data begins arriving when the selected market changes.

## Browser example

```js
const socket = new WebSocket("wss://api.paperdrill.dev");

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({
    method: "SUBSCRIBE",
    params: ["trade:SOL_USD"]
  }));
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
});
```

## Trade message

```json
{
  "event": "trade",
  "symbol": "SOL_USD",
  "id": "3a96948f-aead-4b4b-93f4-78cc19427eaf",
  "price": "125.50",
  "qty": "1.25",
  "maker": false,
  "timestamp": 1788350400000
}
```

## Depth message

Depth messages contain changed levels only. Read [Order book](/docs/orderbook) before using them to maintain a local book.

```json
{
  "event": "depth",
  "symbol": "SOL_USD",
  "bids": [],
  "asks": [{ "price": "125.60", "qty": "3.25" }],
  "lastUpdateId": 1843,
  "timestamp": 1788350400100
}
```

## Ticker message

Ticker messages use the same shape as the REST ticker response and are published at most once per second when trades change the market.

## Unsubscribe and reconnect

```json
{
  "method": "UNSUBSCRIBE",
  "params": ["trade:SOL_USD"]
}
```

Connections can close during deployments or network interruptions. Reconnect with backoff and subscribe to the required channels again after the new connection opens.
