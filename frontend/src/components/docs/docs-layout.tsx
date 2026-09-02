import { NavLink, Outlet } from "react-router-dom";
import { docs } from "@/content/docs";
import { cn } from "@/lib/utils";

function DocLink({ title, slug }: { title: string; slug: string }) {
	return (
		<NavLink
			to={slug ? `/docs/${slug}` : "/docs"}
			end={!slug}
			className={({ isActive }) =>
				cn(
					"block shrink-0 rounded-md px-3 py-2 text-sm transition-colors",
					isActive
						? "bg-l2 font-medium text-high-emphasis"
						: "text-medium-emphasis hover:bg-l2 hover:text-high-emphasis",
				)
			}
		>
			{title}
		</NavLink>
	);
}

export function DocsLayout() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-1 px-4 sm:px-6">
			<aside className="hidden w-56 shrink-0 border-r border-border/40 py-10 pr-6 md:block">
				<nav className="sticky top-24 space-y-1">
					{docs.map((doc) => <DocLink key={doc.slug} title={doc.title} slug={doc.slug} />)}
				</nav>
			</aside>
			<main className="min-w-0 flex-1 py-8 md:px-10 md:py-10">
				<nav className="mb-8 flex gap-1 overflow-x-auto border-b border-border/40 pb-3 md:hidden">
					{docs.map((doc) => <DocLink key={doc.slug} title={doc.title} slug={doc.slug} />)}
				</nav>
				<div className="max-w-3xl">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
