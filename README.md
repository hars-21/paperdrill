<div align="center">
  <h1>PaperDrill</h1>
  <p><strong>The exchange built for developers, not spectators.</strong></p>

  <p>
    <img alt="Release v1.0.0" src="https://img.shields.io/badge/release-v1.1.0-6d5dfc">
    <img alt="Bun" src="https://img.shields.io/badge/runtime-Bun-000000?logo=bun&logoColor=white">
    <img alt="TypeScript" src="https://img.shields.io/badge/language-TypeScript-3178c6?logo=typescript&logoColor=white">
    <img alt="Docker" src="https://img.shields.io/badge/deployment-Docker-2496ed?logo=docker&logoColor=white">
  </p>

  <p>
    <a href="https://paperdrill.dev">Platform</a> ·
    <a href="https://paperdrill.dev/docs">API documentation</a> ·
    <a href="https://api.paperdrill.dev">API</a>
  </p>
</div>

PaperDrill is a live paper-trading exchange simulator with a real matching engine and order book. Trade through the web interface or connect a bot through the API—no KYC and no real funds at risk.

## Features

- **Live matching engine** — price-time priority matching rather than mocked fills.
- **Real-time market data** — order book, trades, tickers, and updating candles over WebSocket.
- **Persistent accounts** — simulated balances, open orders, order history, and trade history.
- **Public leaderboard** — compare simulated portfolio performance with other traders.
- **Scoped API keys** — programmable account access and order management.
- **Bot-friendly API** — REST trading endpoints and public WebSocket feeds.
- **Daily simulated credit** — idempotent recurring credit with an adjustable PnL baseline.

## Architecture

![PaperDrill architecture](/assets/architecture.png)

| Service    | Responsibility                                                              |
| ---------- | --------------------------------------------------------------------------- |
| `frontend` | React SPA for markets, trading, account management, docs, and leaderboard   |
| `backend`  | Express REST/WebSocket API, authentication, validation, and market metadata |
| `engine`   | In-memory balances, order books, matching, and periodic snapshots           |
| `worker`   | Persists orders/fills and derives candles and tickers                       |
| `bot`      | Optional market makers for the supported markets                            |
| PostgreSQL | Accounts, markets, orders, fills, candles, credits, and leaderboard data    |
| Redis      | Commands, responses, event streams, pub/sub, and runtime checkpoints        |

Backend, engine, and worker communicate through Redis. Production uses an external PostgreSQL provider; Redis and engine snapshots use persistent Docker volumes, with nginx running on the application host.

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| Runtime        | Bun + TypeScript                          |
| Frontend       | React 19, Tailwind CSS 4, TanStack Query  |
| API            | Express 5, WebSocket (`ws`), Zod          |
| Data           | PostgreSQL/TimescaleDB, Prisma 7, Redis 7 |
| Observability  | Structured service logs, Sentry, PostHog  |
| Infrastructure | Docker Compose, nginx, GHCR, Cloudflare   |
