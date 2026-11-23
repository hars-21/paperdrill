import type { ReactNode } from "react";

const AUTH_CAPABILITIES = [
	{
		title: "Trade",
		description: "Use the terminal or API against the same live order book.",
	},
	{
		title: "Measure",
		description: "Follow portfolio value, profit and loss, and every execution.",
	},
	{
		title: "Compete",
		description: "Build a public record and compare your return globally.",
	},
] as const;

export function AuthShell({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-full w-full flex-1 lg:grid-cols-[minmax(22rem,.82fr)_minmax(0,1.18fr)]">
			<aside className="hidden min-h-0 border-r border-border/50 bg-l1/45 lg:flex">
				<div className="mx-auto flex w-full max-w-xl flex-col justify-between px-10 py-12 xl:px-14 xl:py-16">
					<div className="max-w-md">
						<div className="flex items-center gap-3">
							<span className="h-px w-8 bg-primary/70" aria-hidden="true" />
							<span className="text-xs font-medium tracking-[0.2em] text-low-emphasis uppercase">
								PaperDrill
							</span>
						</div>
						<h2 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-high-emphasis xl:text-5xl">
							A record built on every decision.
						</h2>
						<p className="mt-5 max-w-sm text-base leading-7 text-medium-emphasis">
							Trade simulated markets with real matching, then measure your standing without risking
							capital.
						</p>
					</div>

					<div>
						<dl className="max-w-md border-t border-border/60">
							{AUTH_CAPABILITIES.map((item) => (
								<div
									key={item.title}
									className="grid grid-cols-[5rem_1fr] gap-5 border-b border-border/50 py-4"
								>
									<dt className="text-sm font-semibold text-high-emphasis">{item.title}</dt>
									<dd className="text-sm leading-6 text-medium-emphasis">{item.description}</dd>
								</div>
							))}
						</dl>
						<p className="mt-8 max-w-md text-xs leading-5 text-low-emphasis">
							Paper credits are for practice. Rankings exclude credits and deposits.
						</p>
					</div>
				</div>
			</aside>

			<div className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
				<div className="w-full max-w-sm">{children}</div>
			</div>
		</div>
	);
}
