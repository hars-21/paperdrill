# WebSocket

The public WebSocket streams live market updates without authentication.

```text
wss://api.paperdrill.dev
```

## Subscribe and unsubscribe

Send `SUBSCRIBE` after the connection opens. One message may subscribe to multiple channels.

```json
{
	"method": "SUBSCRIBE",
	"params": ["trade:SOL_USD", "depth:SOL_USD", "ticker:SOL_USD", "candle:SOL_USD"]
}
```

| Channel         | Message                               |
| --------------- | ------------------------------------- |
| `trade:SYMBOL`  | Completed public trade                |
| `depth:SYMBOL`  | Changed order-book levels only        |
| `ticker:SYMBOL` | Updated 24-hour statistics            |
| `candle:SYMBOL` | Current candle updated on every trade |

There is no subscription acknowledgement. Data begins when the selected market changes.

```js
const socket = new WebSocket("wss://api.paperdrill.dev");

socket.addEventListener("open", () => {
	socket.send(
		JSON.stringify({
			method: "SUBSCRIBE",
			params: ["trade:SOL_USD", "ticker:SOL_USD"],
		}),
	);
});

socket.addEventListener("message", ({ data }) => {
	const message = JSON.parse(data);
	console.log(message.event, message);
});
```

To stop a channel, send the same params with `UNSUBSCRIBE`.

## Message shapes

### Trade

```json
{
	"event": "trade",
	"symbol": "SOL_USD",
	"id": "fill_123",
	"price": "125.50",
	"qty": "1.25",
	"maker": false,
	"timestamp": 1789812000000
}
```

### Ticker and candle

Ticker messages use the [REST ticker](/docs/markets) shape. Candle messages use the same OHLCV fields as the candle endpoint and have `event: "candle"`.

### Depth

Depth messages contain changed levels only. See [Order book](/docs/orderbook) for the snapshot-and-buffer procedure.

## Reconnect

Connections can close during a deployment or network interruption. Reconnect with exponential backoff, then resubscribe to every desired channel. Fetch a fresh depth snapshot after reconnecting before trusting a local order book.
