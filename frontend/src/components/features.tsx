import { Card } from "./ui/card";
import { Trophy, Lock } from "lucide-react";

export function Features() {
	return (
		<section
			id="features"
			className="border-t border-border/40 px-6 py-20 bg-background select-none"
		>
			<div className="mx-auto max-w-6xl">
				<div className="mb-14 text-center">
					<h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
						Built for Developers
					</h2>
					<p className="mx-auto max-w-lg text-medium-emphasis text-sm leading-relaxed">
						Not a diagram. Not a one-time demo. A live exchange you can actually send orders to.
					</p>
				</div>

				<div className="space-y-16">
					<div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
						<div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1">
							<Card className="w-full max-w-md border-border/40 overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-medium text-medium-emphasis">
											Price-Time Priority Engine
										</span>
									</div>
									<span className="text-[10px] text-low-emphasis">BTC/USD</span>
								</div>
								<div className="p-4 text-[10px] space-y-1">
									{[65435.0, 65432.5, 65430.0].map((price, i) => (
										<div
											key={i}
											className="relative flex justify-between py-1 px-2 rounded-sm overflow-hidden hover:bg-muted/10"
										>
											<div
												className="absolute right-0 top-0 bottom-0 bg-red-text/5"
												style={{ width: `${30 * (i + 1)}%` }}
											/>
											<span className="text-red-text font-medium relative z-10">
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

									<div className="border-y border-border/40 my-2 py-1.5 text-center text-medium-emphasis font-medium flex justify-between px-2">
										<span>Spread</span>
										<span className="text-high-emphasis">2.50 USD</span>
									</div>

									{[65427.5, 65425.0, 65422.5].map((price, i) => (
										<div
											key={i}
											className="relative flex justify-between py-1 px-2 rounded-sm overflow-hidden hover:bg-muted/10"
										>
											<div
												className="absolute right-0 top-0 bottom-0 bg-green-text/5"
												style={{ width: `${20 * (i + 2)}%` }}
											/>
											<span className="text-green-text font-medium relative z-10">
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

						<div className="w-full lg:w-1/2 space-y-4 order-1 lg:order-2">
							<h3 className="text-lg font-bold tracking-tight text-high-emphasis">
								Live Matching Engine
							</h3>
							<p className="text-sm leading-relaxed text-medium-emphasis">
								Real price-time priority order matching, not a mock. Orders are matched instantly
								based on price improvement first then time of submission - the same logic used in
								production exchanges.
							</p>
							<ul className="space-y-2 text-xs text-medium-emphasis">
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Price-time priority matching with instant execution feedback.</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Visualized order book queues and real-time depth changes.</span>
								</li>
							</ul>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
						<div className="w-full lg:w-1/2 space-y-4">
							<h3 className="text-lg font-bold tracking-tight text-high-emphasis">
								Real-Time Order Book
							</h3>
							<p className="text-sm leading-relaxed text-medium-emphasis">
								Watch depth and trades move over a live WebSocket feed. See how the book reacts to
								orders in real time - the same data feed a production trading system would give you.
							</p>
							<ul className="space-y-2 text-xs text-medium-emphasis">
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>WebSocket feeds for real-time order book and trade updates.</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Observe how the book reacts to orders in real time.</span>
								</li>
							</ul>
						</div>

						<div className="w-full lg:w-1/2 flex justify-center">
							<Card className="w-full max-w-md border-border/40 overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 text-[10px] text-medium-emphasis">
									<span className="font-medium text-high-emphasis">Live Depth</span>
									<span className="text-success font-medium">WebSocket</span>
								</div>
								<div className="p-4 text-[10px] space-y-3 leading-relaxed">
									<div className="space-y-1">
										{[65435.0, 65432.5, 65430.0].map((price, i) => (
											<div key={i} className="flex justify-between">
												<span className="text-red-text">{price.toFixed(2)}</span>
												<span className="text-low-emphasis">{(0.18 * (i + 1.5)).toFixed(2)}</span>
											</div>
										))}
									</div>
									<div className="border-y border-border/40 py-1.5 text-center text-medium-emphasis">
										Spread: 2.50 USD
									</div>
									<div className="space-y-1">
										{[65427.5, 65425.0, 65422.5].map((price, i) => (
											<div key={i} className="flex justify-between">
												<span className="text-green-text">{price.toFixed(2)}</span>
												<span className="text-low-emphasis">{(0.24 * (i + 1.2)).toFixed(2)}</span>
											</div>
										))}
									</div>
								</div>
							</Card>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
						<div className="w-full lg:w-1/2 space-y-4">
							<h3 className="text-lg font-bold tracking-tight text-high-emphasis">
								Persistent Accounts
							</h3>
							<p className="text-sm leading-relaxed text-medium-emphasis">
								Simulated balances, full order history, nothing resets on refresh. Your sandbox
								state persists across sessions - trade, come back tomorrow and your portfolio is
								exactly where you left it.
							</p>
							<ul className="space-y-2 text-xs text-medium-emphasis">
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Pre-funded sandbox with simulated USD and crypto balances.</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Complete order history and execution logs preserved.</span>
								</li>
							</ul>
						</div>

						<div className="w-full lg:w-1/2 flex justify-center">
							<Card className="w-full max-w-md border-border/40 overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
									<span className="text-[10px] font-medium text-medium-emphasis">
										Account Balances
									</span>
									<span className="text-[10px] text-success font-medium">ACTIVE</span>
								</div>
								<div className="p-4 space-y-4">
									<div className="flex justify-between items-end border-b border-border/40 pb-3">
										<div>
											<span className="text-[10px] text-medium-emphasis font-medium">
												Net Worth
											</span>
											<h4 className="text-lg font-bold text-high-emphasis mt-0.5">$110,450.00</h4>
										</div>
										<span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-md font-medium">
											+$2,450 (2.2%)
										</span>
									</div>

									<div className="space-y-3 text-xs">
										<div className="space-y-1">
											<div className="flex justify-between text-[11px]">
												<span className="font-medium text-high-emphasis">USD</span>
												<span className="text-medium-emphasis">$10,000.00</span>
											</div>
											<div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
												<div className="h-full bg-primary rounded-full" style={{ width: "9%" }} />
											</div>
										</div>
										<div className="space-y-1">
											<div className="flex justify-between text-[11px]">
												<span className="font-medium text-high-emphasis">BTC</span>
												<span className="text-medium-emphasis">1.50 BTC ($98,137.50)</span>
											</div>
											<div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
												<div className="h-full bg-primary rounded-full" style={{ width: "81%" }} />
											</div>
										</div>
										<div className="space-y-1">
											<div className="flex justify-between text-[11px]">
												<span className="font-medium text-high-emphasis">ETH</span>
												<span className="text-medium-emphasis">1.20 ETH ($2,312.50)</span>
											</div>
											<div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
												<div className="h-full bg-primary rounded-full" style={{ width: "10%" }} />
											</div>
										</div>
									</div>
								</div>
							</Card>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
						<div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1">
							<Card className="w-full max-w-md border-border/40 overflow-hidden relative">
								<div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
									<Lock className="size-8 text-medium-emphasis" />
									<span className="text-sm font-semibold text-high-emphasis">Coming Soon</span>
									<span className="text-xs text-medium-emphasis">Public Leaderboard</span>
								</div>
								<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-medium text-medium-emphasis">
											Public Leaderboard
										</span>
										<Trophy className="size-3 text-primary" />
									</div>
									<span className="text-[10px] text-low-emphasis">All Time</span>
								</div>
								<div className="p-4 text-[10px] opacity-40">
									<div className="flex justify-between text-[9px] text-low-emphasis font-medium uppercase tracking-wider mb-2 px-2">
										<span>Rank</span>
										<span>Trader</span>
										<span>PnL</span>
									</div>
									<div className="space-y-1.5">
										{[
											{
												rank: 1,
												name: "quant_whale",
												pnl: "+$14,220",
												pct: "+14.2%",
												color: "text-primary",
											},
											{
												rank: 2,
												name: "arb_master",
												pnl: "+$9,870",
												pct: "+9.9%",
												color: "text-high-emphasis",
											},
											{
												rank: 3,
												name: "trend_rider",
												pnl: "+$7,340",
												pct: "+7.3%",
												color: "text-high-emphasis",
											},
										].map((entry) => (
											<div
												key={entry.rank}
												className="flex items-center justify-between py-1.5 px-2 rounded-md bg-l2 border border-border/30"
											>
												<span className={`font-bold w-6 ${entry.color}`}>#{entry.rank}</span>
												<span className="flex-1 font-mono text-high-emphasis">{entry.name}</span>
												<div className="text-right">
													<span className="text-success font-medium">{entry.pnl}</span>
													<span className="text-low-emphasis ml-1">({entry.pct})</span>
												</div>
											</div>
										))}
									</div>
								</div>
							</Card>
						</div>

						<div className="w-full lg:w-1/2 space-y-4 order-1 lg:order-2">
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-bold tracking-tight text-high-emphasis">
									Public Leaderboard
								</h3>
								<span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
									Coming Soon
								</span>
							</div>
							<p className="text-sm leading-relaxed text-medium-emphasis">
								See how your strategy stacks up against everyone else's. Compare PnL, win rates and
								strategy effectiveness across the community.
							</p>
							<ul className="space-y-2 text-xs text-medium-emphasis">
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Real-time rankings based on simulated PnL and risk metrics.</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Compare strategies and learn from top-performing traders.</span>
								</li>
							</ul>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
						<div className="w-full lg:w-1/2 space-y-4 order-1 lg:order-2">
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-bold tracking-tight text-high-emphasis">Bot Support</h3>
								<span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
									Coming Soon
								</span>
							</div>
							<p className="text-sm leading-relaxed text-medium-emphasis">
								Register, get an API key and connect a trading bot to the live market. Write a
								strategy in any language, point it at the API and compete on the leaderboard fully
								automated, no UI required.
							</p>
							<ul className="space-y-2 text-xs text-medium-emphasis">
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Connect bots via REST API and WebSocket feeds.</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Compete against other bots and human traders on the leaderboard.</span>
								</li>
							</ul>
						</div>

						<div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1">
							<Card className="w-full max-w-md border-border/40 overflow-hidden relative">
								<div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
									<Lock className="size-8 text-medium-emphasis" />
									<span className="text-sm font-semibold text-high-emphasis">Coming Soon</span>
									<span className="text-xs text-medium-emphasis">API Keys & Bot Connectivity</span>
								</div>
								<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
									<span className="text-[10px] font-medium text-medium-emphasis">
										Bot Connections
									</span>
									<span className="text-[10px] text-low-emphasis">Live Market</span>
								</div>
								<div className="p-4 space-y-3 opacity-40">
									{[
										{ name: "Market Maker Bot", status: "Connected", pnl: "+$1,240" },
										{ name: "Momentum Strategy", status: "Connected", pnl: "+$890" },
										{ name: "Arb Scanner", status: "Disconnected", pnl: "+$320" },
									].map((bot, i) => (
										<div
											key={i}
											className="flex items-center justify-between p-2.5 rounded-md border border-border/40 bg-l2 text-[10px]"
										>
											<div className="space-y-1">
												<div className="font-medium text-high-emphasis">{bot.name}</div>
												<div
													className={`font-medium ${bot.status === "Connected" ? "text-success" : "text-low-emphasis"}`}
												>
													{bot.status}
												</div>
											</div>
											<div className="text-right">
												<div className="text-success font-medium">{bot.pnl}</div>
											</div>
										</div>
									))}
								</div>
							</Card>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
						<div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1">
							<Card className="w-full max-w-md border-border/40 overflow-hidden relative">
								<div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
									<Lock className="size-8 text-medium-emphasis" />
									<span className="text-sm font-semibold text-high-emphasis">Coming Soon</span>
									<span className="text-xs text-medium-emphasis">Full REST API & API Keys</span>
								</div>
								<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
									<span className="text-[10px] font-medium text-medium-emphasis">API Keys</span>
									<span className="text-[10px] text-success font-medium">2 Active</span>
								</div>
								<div className="p-4 space-y-3 opacity-40">
									{[
										{ name: "Trading Bot", key: "pd_live_a3f8...x9k2", created: "2 days ago" },
										{ name: "Backtest Script", key: "pd_live_b7c1...m4p6", created: "5 hours ago" },
									].map((apiKey, i) => (
										<div
											key={i}
											className="flex items-center justify-between p-2.5 rounded-md border border-border/40 bg-l2 text-[10px]"
										>
											<div className="space-y-1">
												<div className="font-medium text-high-emphasis">{apiKey.name}</div>
												<div className="font-mono text-low-emphasis">{apiKey.key}</div>
											</div>
											<div className="text-right space-y-1">
												<div className="text-low-emphasis">{apiKey.created}</div>
											</div>
										</div>
									))}
									<div className="text-[9px] text-low-emphasis pt-1">
										Authenticate requests via{" "}
										<code className="bg-l3 px-1 py-0.5 rounded text-[9px]">X-API-Key</code> header
									</div>
								</div>
							</Card>
						</div>

						<div className="w-full lg:w-1/2 space-y-4 order-1 lg:order-2">
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-bold tracking-tight text-high-emphasis">
									API-First Access
								</h3>
								<span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
									Coming Soon
								</span>
							</div>
							<p className="text-sm leading-relaxed text-medium-emphasis">
								Full REST API and API keys built for bots, not just a UI. Generate an API key and
								connect your trading scripts, bots or custom clients directly - no manual UI
								interaction required.
							</p>
							<ul className="space-y-2 text-xs text-medium-emphasis">
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Authenticate via header - ideal for bots and automated strategies.</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="h-1 w-1 rounded-full bg-red-text shrink-0" />
									<span>Multiple keys per account with instant revocation.</span>
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
