import AnnouncementBar from "@/components/landing/announcement-bar";
import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import About from "@/components/landing/about";
import CtaSection from "@/components/landing/cta-section";
import Footer from "@/components/landing/footer";

export function LandingPage() {
	return (
		<div className="min-h-screen bg-background font-sans antialiased">
			<AnnouncementBar />
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
