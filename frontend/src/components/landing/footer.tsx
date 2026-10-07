import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { getLastTradePath } from "@/lib/ux-preferences";

export function Footer() {
	return (
		<footer className="border-t border-border/50 bg-background">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
				<div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
					<div className="sm:col-span-2">
						<BrandLogo href="/" />
						<p className="mt-3 max-w-xs text-sm leading-6 text-medium-emphasis">
							Competitive credit trading with live markets, API access, and global rankings.
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
								<Link
									to={getLastTradePath()}
									className="transition-colors hover:text-high-emphasis"
								>
									Trade
								</Link>
							</li>
							<li>
								<Link to="/leaderboard" className="transition-colors hover:text-high-emphasis">
									Leaderboard
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="text-xs font-semibold text-low-emphasis mb-3">Developers</h4>
						<ul className="space-y-2 text-sm text-medium-emphasis">
							<li>
								<a
									href="https://docs.paperdrill.dev"
									className="transition-colors hover:text-high-emphasis"
								>
									Documentation
								</a>
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

				<div className="mt-12 flex flex-col justify-between gap-3 border-t border-border/50 pt-6 sm:flex-row sm:items-center">
					<p className="text-xs text-low-emphasis">
						&copy; {new Date().getFullYear()} PaperDrill. All rights reserved.
					</p>
					<p className="text-xs text-low-emphasis">
						Credits have no monetary value. No real funds or assets are involved.
					</p>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
