import { Card, CardContent } from "./ui/card";
import { Terminal, Database, ShieldAlert, ArrowUpRight, CheckCircle2 } from "lucide-react";

export function Features() {
	return (
		<section
			id="features"
			className="border-t border-border/40 px-6 py-24 bg-background select-none"
		>
			<div className="mx-auto max-w-6xl">
				<div className="mb-20 text-center">
					<h2 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
						Observe Trading Mechanics
					</h2>
					<p className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
						Atlas provides fully transparent matching engine playground infrastructure designed
						specifically for developers to build, understand and validate trading code.
					</p>
				</div>

				<div className="space-y-32">
					<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
						<div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1">
							<Card className="w-full max-w-md border-border/40 bg-card/50 shadow-md overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5 bg-muted/15">
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
											Observable Matching Book
										</span>
										<span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
									</div>
									<span className="text-[10px] font-mono text-muted-foreground/60">BTC/USD</span>
								</div>
								<div className="p-4 font-mono text-[10px] space-y-1">
									{[65435.0, 65432.5, 65430.0].map((price, i) => (
										<div
											key={i}
											className="relative flex justify-between py-1 px-2 rounded-sm overflow-hidden hover:bg-muted/10"
										>
											<div
												className="absolute right-0 top-0 bottom-0 bg-destructive/5"
												style={{ width: `${30 * (i + 1)}%` }}
											/>
											<span className="text-destructive font-medium relative z-10">
												{price.toFixed(2)}
											</span>
											<span className="text-high-emphasis/80 relative z-10">
												{(0.18 * (i + 1.5)).toFixed(2)}
											</span>
											<span className="text-low-emphasis relative z-10">
												{(price * 0.18 * (i + 1.5)).toLocaleString(undefined, {
													maximumFractionDigits: 0,
												})}{" "}
												USD
											</span>
										</div>
									))}

									<div className="border-y border-border/30 my-2 py-1.5 text-center text-muted-foreground font-semibold flex justify-between px-2">
										<span>SPREAD</span>
										<span className="text-high-emphasis">2.50 USD</span>
									</div>

									{[65427.5, 65425.0, 65422.5].map((price, i) => (
										<div
											key={i}
											className="relative flex justify-between py-1 px-2 rounded-sm overflow-hidden hover:bg-muted/10"
										>
											<div
												className="absolute right-0 top-0 bottom-0 bg-success/5"
												style={{ width: `${20 * (i + 2)}%` }}
											/>
											<span className="text-success font-medium relative z-10">
												{price.toFixed(2)}
											</span>
											<span className="text-high-emphasis/80 relative z-10">
												{(0.24 * (i + 1.2)).toFixed(2)}
											</span>
											<span className="text-low-emphasis relative z-10">
												{(price * 0.24 * (i + 1.2)).toLocaleString(undefined, {
													maximumFractionDigits: 0,
												})}{" "}
												USD
											</span>
										</div>
									))}
								</div>
							</Card>
						</div>

						<div className="w-full lg:w-1/2 space-y-5 order-1 lg:order-2">
							<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary shadow-sm">
								<Database className="size-4" />
							</div>
							<h3 className="text-xl font-bold tracking-tight sm:text-2xl text-high-emphasis">
								Observe Microstructure
							</h3>
							<p className="text-sm leading-relaxed text-muted-foreground">
								Unlike black-box exchanges, Atlas displays the internal matching logic of every
								trade. Inspect how orders are filled, how depth triggers and analyze matching
								latency step by step.
							</p>
							<ul className="space-y-2.5 text-xs text-muted-foreground">
								<li className="flex items-center gap-2">
									<CheckCircle2 className="size-4 text-success shrink-0" />
									<span>Visualized orderbook queues and matching execution lines.</span>
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="size-4 text-success shrink-0" />
									<span>Step-through execution debugging for custom algorithms.</span>
								</li>
							</ul>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
						<div className="w-full lg:w-1/2 space-y-5">
							<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary shadow-sm">
								<Terminal className="size-4" />
							</div>
							<h3 className="text-xl font-bold tracking-tight sm:text-2xl text-high-emphasis">
								Developer-First Infrastructure
							</h3>
							<p className="text-sm leading-relaxed text-muted-foreground">
								Trade programmatically using our high-speed WebSocket feeds or simple HTTP REST
								endpoints. Atlas supports standard order types, execution reports, and websocket
								balance updates.
							</p>
							<ul className="space-y-2.5 text-xs text-muted-foreground">
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-success shrink-0" />
									<span>Low-latency, real-time WebSocket market feeds.</span>
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-success shrink-0" />
									<span>Clean request/response payloads built for developer experience.</span>
								</li>
							</ul>
						</div>

						<div className="w-full lg:w-1/2 flex justify-center">
							<Card className="w-full max-w-md border-border/40 bg-card/50 shadow-md overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5 bg-muted/15 font-mono text-[10px] text-muted-foreground">
									<span className="font-semibold text-high-emphasis">POST /api/v1/order</span>
									<span>client.ts</span>
								</div>
								<div className="p-4 font-mono text-[10px] space-y-3 leading-relaxed">
									<div>
										<div className="text-muted-foreground/60">// Request Payload</div>
										<pre className="text-high-emphasis bg-muted/10 p-2.5 rounded-md border border-border/10">
											{`{
  "market": "BTC_USD",
  "side": "buy",
  "type": "limit",
  "price": "65427.50",
  "quantity": "0.50"
}`}
										</pre>
									</div>
									<div>
										<div className="text-muted-foreground/60">// Match Response</div>
										<pre className="text-success bg-success/5 p-2.5 rounded-md border border-success/15">
											{`{
  "orderId": "ord_a78f29",
  "status": "filled",
  "filledSize": "0.50",
  "avgPrice": "65427.50",
  "timestamp": 1781600215042
}`}
										</pre>
									</div>
								</div>
							</Card>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
						<div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1">
							<Card className="w-full max-w-md border-border/40 bg-card/50 shadow-md overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5 bg-muted/15">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
										Sandbox Balance Allocation
									</span>
									<span className="text-[10px] text-success font-semibold flex items-center gap-0.5">
										ACTIVE <ArrowUpRight className="h-3 w-3" />
									</span>
								</div>
								<div className="p-4 space-y-4">
									<div className="flex justify-between items-end border-b border-border/20 pb-3">
										<div>
											<span className="text-[10px] text-muted-foreground uppercase font-semibold">
												Available Net Worth
											</span>
											<h4 className="text-xl font-bold font-mono text-high-emphasis mt-0.5">
												$110,450.00
											</h4>
										</div>
										<span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-md font-semibold">
											+$2,450 (2.2%)
										</span>
									</div>

									<div className="space-y-3 font-mono text-xs">
										<div className="space-y-1">
											<div className="flex justify-between text-[11px]">
												<span className="font-semibold text-high-emphasis">USD</span>
												<span className="text-muted-foreground">$10,000.00</span>
											</div>
											<div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
												<div className="h-full bg-primary rounded-full" style={{ width: "9%" }} />
											</div>
										</div>
										<div className="space-y-1">
											<div className="flex justify-between text-[11px]">
												<span className="font-semibold text-high-emphasis">BTC</span>
												<span className="text-muted-foreground">1.50 BTC ($98,137.50)</span>
											</div>
											<div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
												<div className="h-full bg-primary rounded-full" style={{ width: "81%" }} />
											</div>
										</div>

										<div className="space-y-1">
											<div className="flex justify-between text-[11px]">
												<span className="font-semibold text-high-emphasis">ETH</span>
												<span className="text-muted-foreground">1.20 ETH ($2,312.50)</span>
											</div>
											<div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
												<div className="h-full bg-primary rounded-full" style={{ width: "10%" }} />
											</div>
										</div>
									</div>
								</div>
							</Card>
						</div>

						<div className="w-full lg:w-1/2 space-y-5 order-1 lg:order-2">
							<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary shadow-sm">
								<ShieldAlert className="size-4" />
							</div>
							<h3 className="text-xl font-bold tracking-tight sm:text-2xl text-high-emphasis">
								Safe sandbox environment
							</h3>
							<p className="text-sm leading-relaxed text-muted-foreground">
								Build and refine strategies without financial risk. Place mock trades, manage
								virtual asset allocations and reset your playground balances instantly with a single
								command or button click.
							</p>
							<ul className="space-y-2.5 text-xs text-muted-foreground">
								<li className="flex items-center gap-2">
									<CheckCircle2 className="size-4 text-success shrink-0" />
									<span>Pre-funded sandbox with $10,000 mock USD.</span>
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="size-4 text-success shrink-0" />
									<span>Instant resets to restore baseline balances at any time.</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Features;
