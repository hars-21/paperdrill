import Hero from "@/components/landing/hero";
import TradingModesSection from "@/components/landing/trading-modes";
import RankingSection from "@/components/landing/ranking-section";
import ExchangeCoreSection from "@/components/landing/exchange-core";
import CtaSection from "@/components/landing/cta-section";

export function LandingPage() {
	return (
		<div className="bg-background">
			<Hero />
			<TradingModesSection />
			<RankingSection />
			<ExchangeCoreSection />
			<CtaSection />
		</div>
	);
}
