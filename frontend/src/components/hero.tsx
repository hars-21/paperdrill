import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
	return (
		<section className="flex items-center justify-center px-6 py-42 overflow-hidden bg-background">
			<div className="mx-auto max-w-3xl text-center relative z-10">
				<h1 className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl text-high-emphasis">
					Trading Infrastructure <span className="text-primary">Simulator</span>
				</h1>

				<p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-medium-emphasis sm:text-base">
					Transparent, paper-trading infrastructure for developers. Replay markets, observe matching
					execution, simulate strategies and build with confidence.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3">
					<Link to="/signup">
						<Button size="lg" className="gap-1.5">
							Get Started <ArrowRight className="size-4" />
						</Button>
					</Link>
					<Link to="/trade/BTC_USD">
						<Button size="lg" variant="secondary">
							Open Playground
						</Button>
					</Link>
				</div>

				<div className="mt-14 text-left mx-auto max-w-3xl rounded-xl border border-border/40 bg-card overflow-hidden select-none">
					<div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/40">
						<span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
						<span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
						<span className="h-2.5 w-2.5 rounded-full bg-success/60" />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40 text-xs">
						<div className="p-4 space-y-3">
							<div className="text-[10px] font-medium text-medium-emphasis">Order Book</div>
							<div className="space-y-1">
								{[65430, 65428, 65426].map((price, i) => (
									<div key={i} className="flex justify-between text-[11px]">
										<span className="text-red-text tabular-nums">{price}.50</span>
										<span className="text-low-emphasis tabular-nums">
											{(0.12 * (i + 1)).toFixed(2)}
										</span>
									</div>
								))}
							</div>
							<div className="border-y border-border/40 py-1.5 text-center text-[10px] text-medium-emphasis">
								Spread: 2.50 USD
							</div>
							<div className="space-y-1">
								{[65423, 65421, 65419].map((price, i) => (
									<div key={i} className="flex justify-between text-[11px]">
										<span className="text-green-text tabular-nums">{price}.00</span>
										<span className="text-low-emphasis tabular-nums">
											{(0.35 * (i + 1)).toFixed(2)}
										</span>
									</div>
								))}
							</div>
						</div>

						<div className="md:col-span-2 p-4 flex flex-col justify-between h-56">
							<div className="flex justify-between items-center">
								<div className="text-[10px] font-medium text-medium-emphasis">
									BTC/USD Price Chart
								</div>
								<div className="text-[11px] font-medium text-green-text tabular-nums">+2.45%</div>
							</div>

							<div className="flex-1 flex items-center justify-center py-3">
								<svg className="w-full h-24 stroke-primary stroke-2 fill-none">
									<path
										d="M0 60 Q 40 80 80 40 T 160 55 T 240 25 T 320 8 T 400 20"
										className="stroke-primary"
									/>
									<path
										d="M0 60 Q 40 80 80 40 T 160 55 T 240 25 T 320 8 T 400 20 L 400 90 L 0 90 Z"
										className="fill-primary/5 stroke-none"
									/>
								</svg>
							</div>

							<div className="flex justify-between text-[10px] text-low-emphasis tabular-nums">
								<span>12:00</span>
								<span>12:15</span>
								<span>12:30</span>
								<span>12:45</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Hero;
