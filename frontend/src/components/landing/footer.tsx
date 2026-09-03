import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";

export function Footer() {
	return (
		<footer className="border-t border-border/40 bg-card/20">
			<div className="mx-auto max-w-6xl px-6 py-12">
				<div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
					<div className="sm:col-span-2">
						<BrandLogo href="/" />
						<p className="mt-2 text-sm text-medium-emphasis max-w-xs leading-relaxed">
							The exchange built for developers, not spectators. Real matching engine, real order
							book, zero risk.
						</p>
					</div>

					<div>
						<h4 className="text-xs font-semibold text-low-emphasis mb-3">Platform</h4>
						<ul className="space-y-2 text-sm text-medium-emphasis">
							<li>
								<Link to="/" className="transition-colors hover:text-high-emphasis">
									Home
								</Link>
							</li>
							<li>
								<Link to="/markets" className="transition-colors hover:text-high-emphasis">
									Markets
								</Link>
							</li>
							<li>
								<Link to="/trade/BTC_USD" className="transition-colors hover:text-high-emphasis">
									Trading
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="text-xs font-semibold text-low-emphasis mb-3">Developers</h4>
						<ul className="space-y-2 text-sm text-medium-emphasis">
							<li>
								<Link to="/docs" className="transition-colors hover:text-high-emphasis">
									Documentation
								</Link>
							</li>
							<li>
								<Link to="/changelog" className="transition-colors hover:text-high-emphasis">
									Changelog
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="text-xs font-semibold text-low-emphasis mb-3">Legal</h4>
						<ul className="space-y-2 text-sm text-medium-emphasis">
							<li>
								<Link to="/terms" className="transition-colors hover:text-high-emphasis">
									Terms of Service
								</Link>
							</li>
							<li>
								<Link to="/privacy" className="transition-colors hover:text-high-emphasis">
									Privacy Policy
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-10 border-t border-border/40 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
					<p className="text-xs text-low-emphasis">
						&copy; {new Date().getFullYear()} PaperDrill. All rights reserved.
					</p>
					<p className="text-xs text-low-emphasis">
						v0.3.0-beta - Simulated environment. No real funds or assets are involved.
					</p>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
