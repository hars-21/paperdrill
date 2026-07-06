import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
	return (
		<section className="relative flex min-h-[95vh] items-center justify-center px-6 pt-24 overflow-hidden bg-background">
			<div className="mx-auto max-w-4xl text-center relative z-10">
				<h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-high-emphasis">
					Build, Test and Understand{" "}
					<span className="text-primary bg-clip-text">Trading Systems</span>
				</h1>

				<p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
					Transparent, paper-trading infrastructure for developers. Replay markets, observe matching
					execution, simulate strategies and build with confidence.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-4">
					<Link to="/signup">
						<Button size="lg" className="shadow-md shadow-primary/15 gap-1.5">
							Get Started <ArrowRight className="size-4" />
						</Button>
					</Link>
					<Link to="/trade/BTC_USD">
						<Button size="lg" variant="secondary">
							Open Playground
						</Button>
					</Link>
				</div>

				<div className="mt-16 text-left mx-auto max-w-4xl rounded-xl border border-border/40 bg-card shadow-xl overflow-hidden select-none">
					<div className="flex items-center justify-between border-b border-border/30 px-4 py-3 bg-muted/20">
						<div className="flex gap-1.5">
							<span className="h-3 w-3 rounded-full bg-destructive/60" />
							<span className="h-3 w-3 rounded-full bg-yellow-500/60" />
							<span className="h-3 w-3 rounded-full bg-success/60" />
						</div>
						<div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/40 border border-border/10 text-[10px] font-mono text-muted-foreground/80 w-64 justify-center">
							<span className="opacity-40">https://</span>atlas.dev/playground
						</div>
						<div className="w-12" />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/30 bg-card/40 text-xs">
						<div className="p-4 flex flex-col justify-between h-64 font-mono">
							<div>
								<div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
									Order Book
								</div>
								<div className="space-y-1">
									{[65430, 65428, 65426].map((price, i) => (
										<div key={i} className="flex justify-between text-[11px]">
											<span className="text-destructive font-medium">{price}.50</span>
											<span className="text-low-emphasis">{(0.12 * (i + 1)).toFixed(2)}</span>
										</div>
									))}
								</div>
							</div>

							<div className="py-1.5 my-1.5 border-y border-border/30 text-center text-[10px] text-muted-foreground font-semibold">
								Spread: 2.50 USD
							</div>

							<div className="space-y-1">
								{[65423, 65421, 65419].map((price, i) => (
									<div key={i} className="flex justify-between text-[11px]">
										<span className="text-success font-medium">{price}.00</span>
										<span className="text-low-emphasis">{(0.35 * (i + 1)).toFixed(2)}</span>
									</div>
								))}
							</div>
						</div>

						<div className="md:col-span-2 p-4 flex flex-col justify-between h-64 bg-muted/5">
							<div className="flex justify-between items-center">
								<div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
									BTC/USD Price Chart
								</div>
								<div className="text-[11px] font-semibold font-mono text-success">+2.45%</div>
							</div>

							<div className="flex-1 flex items-center justify-center py-4">
								<svg className="w-full h-28 stroke-primary stroke-2 fill-none overflow-visible">
									<path
										d="M0 80 Q 40 100 80 50 T 160 70 T 240 30 T 320 10 T 400 25"
										className="stroke-primary"
									/>
									<path
										d="M0 80 Q 40 100 80 50 T 160 70 T 240 30 T 320 10 T 400 25 L 400 110 L 0 110 Z"
										className="fill-primary/5 stroke-none"
									/>
									<circle
										cx="320"
										cy="10"
										r="3"
										className="fill-primary stroke-background stroke-2"
									/>
								</svg>
							</div>

							<div className="flex justify-between text-[10px] text-muted-foreground font-mono">
								<span>12:00</span>
								<span>12:15</span>
								<span>12:30</span>
								<span>12:45</span>
							</div>
						</div>

						<div className="p-4 flex flex-col justify-between h-64">
							<div className="space-y-3">
								<div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
									Place Order
								</div>
								<div className="grid grid-cols-2 gap-1 bg-muted p-0.5 rounded-md border border-border/10">
									<div className="bg-success text-white text-center py-1 rounded-sm text-[10px] font-bold">
										Buy
									</div>
									<div className="text-muted-foreground hover:text-high-emphasis text-center py-1 rounded-sm text-[10px] font-medium cursor-pointer">
										Sell
									</div>
								</div>

								<div className="space-y-1.5">
									<div className="flex justify-between text-[10px] text-muted-foreground">
										<span>Price</span>
										<span className="font-mono">USD</span>
									</div>
									<div className="border border-border rounded-md px-2 py-1 bg-muted/20 font-mono text-[11px] text-high-emphasis">
										65,425.50
									</div>
								</div>

								<div className="space-y-1.5">
									<div className="flex justify-between text-[10px] text-muted-foreground">
										<span>Quantity</span>
										<span className="font-mono">BTC</span>
									</div>
									<div className="border border-border rounded-md px-2 py-1 bg-muted/20 font-mono text-[11px] text-high-emphasis">
										0.50
									</div>
								</div>
							</div>

							<Button variant="buy" className="h-8 text-xs">
								Buy BTC
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Hero;
