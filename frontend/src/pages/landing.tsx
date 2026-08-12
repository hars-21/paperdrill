import Hero from "@/components/landing/hero";
import MarketDataSection from "@/components/landing/market-data";
import MatchingEngineSection from "@/components/landing/matching-engine";
import PersistentSection from "@/components/landing/persistent";
import CtaSection from "@/components/landing/cta-section";

export function LandingPage() {
	return (
		<>
			<Hero />
			<MarketDataSection />
			<MatchingEngineSection />
			<PersistentSection />
			<CtaSection />
		</>
	);
}
