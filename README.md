<p align="center">
  <h1 align="center">PaperDrill</h1>
  <p align="center">The exchange built for developers, not spectators.</p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>
</p>

A live, always-on exchange simulator with a real matching engine and order book. Trade on the UI or connect a bot via API - no KYC, no real money, no risk.

## Features

- **Live matching engine** - Price-time priority order matching, not a mock.
- **Real-time order book** - Watch depth and trades move over a live WebSocket feed.
- **Persistent accounts** - Simulated balances, full order history, nothing resets.
- **Public leaderboard** _(Coming Soon)_ - See how your strategy stacks up against others.
- **Bot support** _(Coming Soon)_ - Connect trading bots via REST API and WebSocket.
- **API-first access** _(Coming Soon)_ - Full REST API and API keys for programmatic trading.

## Architecture

![PaperDrill-Architecture](/assets/paperdrill-architecture.png)

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Frontend    | React + TypeScript + Tailwind CSS   |
| Backend     | Express + Prisma ORM                |
| Engine      | Custom matching engine (TypeScript) |
| Database    | PostgreSQL (via TimescaleDB)        |
| Cache/Queue | Redis                               |
| Infra       | Docker, Nginx, Vercel (frontend)    |
