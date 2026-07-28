import { Navbar } from "../components/navbar";
import Hero from "../components/hero";
import Features from "../components/features";
import About from "../components/about";
import CtaSection from "../components/cta-section";
import Footer from "../components/footer";

export function LandingPage() {
	return (
		<div className="min-h-screen bg-background font-sans antialiased">
			<Navbar />
			<main>
				<Hero />
				<Features />
				<About />
				<CtaSection />
			</main>
			<Footer />
		</div>
	);
}
