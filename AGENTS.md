# Repository Guidelines

## Project Structure & Module Organization

PaperDrill is a Bun/TypeScript monorepo without a root `package.json`. Each package owns its dependencies and `bun.lock`:

- `backend/`: Express REST/WebSocket API and Prisma schema/migrations.
- `engine/`: in-memory order matching and snapshot persistence.
- `worker/`: Redis stream persistence, candles, and tickers.
- `bot/`: optional market-making clients.
- `frontend/`: React 19/Tailwind 4 SPA; static assets live in `frontend/public/`.
- `tests/integration/`: black-box cross-service tests.
- `benchmarks/`: HTTP, matching, and WebSocket performance scenarios.

Keep unit tests in `backend/tests/` or `engine/tests/`. Public documentation belongs in `frontend/src/content/docs/`; root `docs/` is stale.

## Build, Test, and Development Commands

Run `bun install` inside an individual package after changing its dependencies. Common root commands are:

- `make up`: start dependencies, migrate/seed the database, and launch backend, engine, and worker.
- `make build`: build the main development containers.
- `make logs SERVICE=backend`: follow service logs.
- `make test-unit`: run backend and engine Bun tests with `.env.test`.
- `make test-integration`: exercise the disposable test stack.
- `make bench`: run the benchmark suite.
- `make down`: stop the development stack.

For frontend-only work, use `cd frontend && bun run dev` or `bun run build`.

## Coding Style & Naming Conventions

Follow existing TypeScript style: tabs, double quotes, semicolons, ESM imports, and trailing commas in multiline constructs. Use `camelCase` for variables/functions, `PascalCase` for components and types, and established kebab-case filenames (for example, `decimal-input.tsx`). No repository-wide formatter or linter is configured, so match adjacent code.

## Testing Guidelines

Tests use `bun:test` and `.test.ts` filenames. Add unit coverage for local logic and integration coverage for cross-service behavior. There is no stated coverage threshold; regressions should include a test that fails without the fix. Run both test commands before submitting service-wide changes.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `ci:`, or a scope such as `fix(bot):`. Keep commits focused. Pull requests should explain the change, identify affected services, link issues, list verification commands, and include screenshots for visible frontend work. Call out migrations, environment changes, or snapshot compatibility concerns.

## Security & Configuration

Never commit `.env.dev`, `.env.prod`, generated Prisma clients, engine snapshots, build output, or secrets. Do not add fallback production credentials. Preserve the established API error envelope and use `bigintReplacer` for BigInt values crossing JSON or Redis boundaries.
