import { screenshots } from "@/assets";

export default function PersistentSection() {
	return (
		<section className="bg-background px-6 py-16 lg:py-24">
			<div className="mx-auto max-w-3xl">
				<h2 className="mb-3 text-2xl font-bold tracking-tight text-high-emphasis sm:text-3xl">
					A sandbox that keeps your state.
				</h2>
				<p className="mb-12 text-sm leading-relaxed text-medium-emphasis sm:text-base">
					Sign up and start with a pre-funded simulated balance. Your portfolio, balances and order
					history persist across sessions, so you can pick up exactly where you left off.
				</p>

				<div className="overflow-hidden rounded-2xl border border-border/40 bg-l2/40 shadow-sm">
					<img
						src={screenshots.balance}
						alt="PaperDrill balance interface"
						className="h-full w-full object-cover"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				</div>
			</div>
		</section>
	);
}
