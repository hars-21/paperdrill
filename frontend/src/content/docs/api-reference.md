# API Reference

Base URL: `https://api.paperdrill.dev/v1`. Public endpoints need no credentials. Protected endpoints require an API key in the `x-api-key` header with the listed scope.

## Market data

| Method | Path                                 | Access | Description                    |
| ------ | ------------------------------------ | ------ | ------------------------------ |
| `GET`  | `/markets`                           | Public | List markets and precisions    |
| `GET`  | `/markets/tickers`                   | Public | Latest ticker for every market |
| `GET`  | `/markets/:symbol/ticker`            | Public | Latest ticker for one market   |
| `GET`  | `/markets/:symbol/orderbook`         | Public | Aggregated depth snapshot      |
| `GET`  | `/markets/:symbol/trades?limit=`     | Public | Recent public trades           |
| `GET`  | `/markets/:symbol/candles?interval=` | Public | Historical candles             |

## Trading

| Method   | Path               | Required scope | Description                      |
| -------- | ------------------ | -------------- | -------------------------------- |
| `POST`   | `/orders`          | `ORDER_CREATE` | Create a limit or market order   |
| `GET`    | `/orders`          | `ORDER_READ`   | Paginated order history          |
| `GET`    | `/orders/open`     | `ORDER_READ`   | Open and partially filled orders |
| `GET`    | `/orders/:orderId` | `ORDER_READ`   | Read one owned order             |
| `DELETE` | `/orders/:orderId` | `ORDER_CANCEL` | Cancel an open order             |
| `GET`    | `/trades?limit=`   | `ORDER_READ`   | Private trade history            |

## Account

| Method | Path               | Required scope | Description                   |
| ------ | ------------------ | -------------- | ----------------------------- |
| `GET`  | `/balances?asset=` | `ACCOUNT_READ` | Available and locked balances |
| `GET`  | `/portfolio`       | `ACCOUNT_READ` | Valued positions and PnL      |
