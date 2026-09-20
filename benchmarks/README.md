# PaperDrill Benchmarks

The benchmark suite measures the main exchange paths against an isolated test environment. It starts disposable PostgreSQL, Redis, backend, engine, and worker services and removes them after the run.

## Run locally

Docker and Bun are required.

```sh
make bench
```

## Current benchmarks

| Benchmark              |                   Default workload | What it measures                                                     |
| ---------------------- | ---------------------------------: | -------------------------------------------------------------------- |
| Unmatched limit orders |                      10,000 orders | HTTP order throughput and p95 latency while orders remain open       |
| Matched limit orders   | 5,000 maker and 5,000 taker orders | HTTP throughput and p95 latency with one fill per taker              |
| Single-order sweep     |                 1,000 maker orders | Time for one taker order to match 1,000 resting orders               |
| WebSocket fan-out      |                    500 connections | Connection time, successful depth delivery, and p95 delivery latency |

HTTP workloads use a default concurrency of 50. Every workload also performs correctness checks and fails when an order or expected delivery is unsuccessful.

The defaults can be adjusted with `HTTP_CONCURRENCY`, `UNMATCHED_ORDERS`, `MATCHED_ORDERS`, `SWEEP_ORDERS`, `WS_CONNECTIONS`, and `WS_TIMEOUT_MS`.
