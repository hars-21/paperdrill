import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Page, PageContent } from "@/components/ui/page";
import { useAuth } from "@/context/AuthContext";

export function NotFoundPage() {
	const { authenticated } = useAuth();

	return (
		<Page className="justify-center">
			<PageContent className="max-w-6xl py-12 sm:py-16">
				<div className="grid items-end gap-12 border-y border-border/50 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
					<div className="max-w-xl">
						<p className="text-sm font-medium text-medium-emphasis">Page not found</p>
						<h1 className="mt-3 text-4xl font-semibold tracking-tight text-high-emphasis sm:text-5xl">
							This page is not here.
						</h1>
						<p className="mt-4 max-w-md text-base leading-7 text-medium-emphasis">
							The address may have changed, or the page may no longer exist.
						</p>
						<div className="mt-8 flex flex-col gap-2 sm:flex-row">
							<Button asChild size="lg" className="h-11 sm:min-w-32">
								<Link to={authenticated ? "/home" : "/"}>Go home</Link>
							</Button>
							<Button asChild size="lg" variant="outline" className="h-11 sm:min-w-36">
								<Link to="/markets">Browse markets</Link>
							</Button>
						</div>
					</div>

					<p
						aria-hidden="true"
						className="select-none text-[clamp(5rem,18vw,12rem)] font-semibold leading-[0.75] tracking-[-0.08em] text-low-emphasis opacity-35"
					>
						404
					</p>
				</div>
			</PageContent>
		</Page>
	);
}
