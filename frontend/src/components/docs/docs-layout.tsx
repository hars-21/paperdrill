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

function DocsNav() {
	const sections = docs.reduce<{ title: string; items: typeof docs }[]>((groups, doc) => {
		const current = groups.at(-1);
		if (current?.title === doc.section) {
			current.items.push(doc);
		} else {
			groups.push({ title: doc.section, items: [doc] });
		}
		return groups;
	}, []);

	return sections.map((section) => (
		<div key={section.title} className="space-y-1">
			<p className="px-3 pt-3 text-[11px] font-semibold tracking-wide text-low-emphasis">
				{section.title}
			</p>
			{section.items.map((doc) => (
				<DocLink key={doc.slug} title={doc.title} slug={doc.slug} />
			))}
		</div>
	));
}

export function DocsLayout() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-1 px-4 sm:px-6">
			<aside className="hidden w-56 shrink-0 border-r border-border/40 py-10 pr-6 md:block">
				<nav className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-3 overflow-y-auto pb-4">
					<DocsNav />
				</nav>
			</aside>
			<main className="min-w-0 flex-1 py-8 md:px-10 md:py-10">
				<nav className="mb-8 flex gap-1 overflow-x-auto border-b border-border/40 pb-3 md:hidden">
					{docs.map((doc) => (
						<DocLink key={doc.slug} title={doc.title} slug={doc.slug} />
					))}
				</nav>
				<div className="max-w-3xl">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
