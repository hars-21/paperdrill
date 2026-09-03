import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { BrandLogo } from "@/components/brand-logo";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";

const LINKS = [
	{ label: "Markets", to: "/markets" },
	{ label: "Trading", to: "/trade/BTC_USD" },
	{ label: "Docs", to: "/docs" },
	{ label: "Changelog", to: "/changelog" },
];

export function Navbar() {
	const { theme, toggleTheme } = useTheme();

	return (
		<header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur border-b border-border/40">
			<div className="relative flex h-14 w-full items-center justify-between px-4">
				<BrandLogo href="/" />

				<nav className="items-center justify-center flex-row hidden gap-6 md:flex flex-1">
					{LINKS.map((link) => (
						<Link
							key={link.label}
							to={link.to}
							className="text-sm text-medium-emphasis hover:text-high-emphasis transition-colors"
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center flex-row gap-2 md:gap-3 shrink-0">
					<Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle Theme">
						{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
					</Button>

					<Link to="/login" className="hidden md:inline-flex">
						<Button variant="ghost" size="sm" className="bg-l3">
							Sign in
						</Button>
					</Link>
					<Link to="/signup" className="hidden md:inline-flex">
						<Button size="sm">Get started</Button>
					</Link>

					<Sheet>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Toggle Menu">
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>

						<SheetContent
							side="left"
							showCloseButton={false}
							className="w-72 max-w-[calc(100vw-2rem)] gap-0 bg-background p-0"
						>
							<SheetTitle className="sr-only">Navigation</SheetTitle>

							<div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
								<SheetClose asChild>
									<BrandLogo href="/" showText={false} showBeta={false} />
								</SheetClose>

								<SheetClose asChild>
									<Button variant="ghost" size="icon-sm" aria-label="Close Menu">
										<X className="size-5" />
									</Button>
								</SheetClose>
							</div>

							<nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
								{LINKS.map((link) => (
									<SheetClose asChild key={link.to}>
										<Link
											to={link.to}
											className="flex items-center h-11 px-3 rounded-lg text-sm text-medium-emphasis hover:text-high-emphasis hover:bg-muted transition-colors"
										>
											{link.label}
										</Link>
									</SheetClose>
								))}

								<SheetClose asChild>
									<Link to="/login" className="mt-2">
										<Button variant="ghost" size="sm" className="w-full h-11 bg-l3">
											Sign in
										</Button>
									</Link>
								</SheetClose>
								<SheetClose asChild>
									<Link to="/signup" className="mt-2">
										<Button size="sm" className="w-full h-11">
											Get started
										</Button>
									</Link>
								</SheetClose>
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}

export default Navbar;
