export function About() {
	return (
		<section className="border-t border-border/40 px-6 py-16 lg:py-20 bg-muted/5">
			<div className="mx-auto max-w-3xl space-y-6">
				<h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">About PaperDrill</h2>

				<p className="text-medium-emphasis text-sm leading-relaxed">
					Most places that teach you how an exchange works give you a diagram. PaperDrill gives you
					an exchange.
				</p>

				<p className="text-medium-emphasis text-sm leading-relaxed">
					It's a live, multi-user matching engine with a real order book and a real-time WebSocket
					feed - the kind of system every "design a stock exchange" interview question asks about
					except here you can actually send it an order. Register, explore the order book, place
					trades and watch the market react in real time alongside other participants.
				</p>

				<p className="text-medium-emphasis text-sm leading-relaxed">
					Built for developers who want to learn distributed systems by touching one, not reading
					about one and for anyone who wants to test a trading strategy against something that
					behaves like a real market, because it is one.
				</p>
			</div>
		</section>
	);
}

export default About;
