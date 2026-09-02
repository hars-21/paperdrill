import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, Sun, Moon, User, LogOut, TrendingUp, Activity, ChevronDown, MailCheck } from "lucide-react";
import { useTheme } from "../lib/theme-provider";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

const NAV_LINKS = [
	{ label: "Home", to: "/" },
	{ label: "Markets", to: "/markets" },
	{ label: "Trading", to: "/trade/BTC_USD" },
];

export function Navbar() {
	const { theme, toggleTheme } = useTheme();
	const { user, verified, setUser } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			await api.signout();
		} catch (err) {
			console.error("Signout failed:", err);
		} finally {
			setUser(null);
			toast.success("Logged out successfully");
			navigate("/");
		}
	};

	return (
		<header className="sticky top-0 z-50 w-full bg-l0">
			<div className="relative flex h-14 w-full items-center px-4">
				<BrandLogo href="/markets" />

				<nav className="items-center justify-center flex-row hidden gap-5 sm:mx-4 md:flex lg:gap-7 xl:gap-8 ml-6">
					{NAV_LINKS.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className="text-medium-emphasis hover:text-high-emphasis transition-colors"
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center flex-row gap-3 ml-auto">
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Toggle Menu">
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>

						<SheetContent side="left" showCloseButton={false} className="gap-0 bg-l0 p-0 w-72">
							<SheetTitle className="sr-only">Navigation</SheetTitle>

							<div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
								<SheetClose asChild>
									<BrandLogo href="/markets" showText={false} showBeta={false} />
								</SheetClose>

								<SheetClose asChild>
									<Button variant="ghost" size="icon-sm" aria-label="Close Menu">
										<X className="size-5" />
									</Button>
								</SheetClose>
							</div>

							<nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
								{NAV_LINKS.map((link) => (
									<SheetClose asChild key={link.to}>
										<Link
											to={link.to}
											className="flex items-center h-11 px-3 rounded-lg text-sm text-medium-emphasis hover:text-high-emphasis hover:bg-l2 transition-colors"
										>
											{link.label}
										</Link>
									</SheetClose>
								))}

								<div className="flex items-center justify-between h-11 px-3 mt-2 border-t border-border/40">
									<span className="text-xs text-medium-emphasis">Theme</span>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={toggleTheme}
										aria-label="Toggle Theme"
									>
										{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
									</Button>
								</div>

								<div className="flex flex-col gap-1 pt-3 border-t border-border/40">
									{user ? (
										<>
											<SheetClose asChild>
												<Link
													to={verified ? "/profile" : "/verify-email"}
													className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-l2 transition-colors"
												>
													<Avatar className="size-8">
														<AvatarFallback className="bg-l3 text-sm font-bold text-high-emphasis">
															{user.name[0]}
														</AvatarFallback>
													</Avatar>

													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium text-high-emphasis">
															{user.name}
														</p>
														<p className="truncate text-xs text-medium-emphasis">{user.email}</p>
													</div>
												</Link>
											</SheetClose>

											<SheetClose asChild>
												<Button
													variant="ghost"
													size="sm"
													onClick={handleLogout}
													className="h-11 w-full justify-start gap-3 rounded-lg px-3 text-primary"
												>
													<LogOut className="size-4" />
													Log out
												</Button>
											</SheetClose>
										</>
									) : (
										<>
											<SheetClose asChild>
												<Link to="/login">
													<Button variant="ghost" size="sm" className="w-full h-11">
														Log in
													</Button>
												</Link>
											</SheetClose>
											<SheetClose asChild>
												<Link to="/signup">
													<Button size="sm" className="w-full h-11">
														Sign up
													</Button>
												</Link>
											</SheetClose>
										</>
									)}
								</div>
							</nav>
						</SheetContent>
					</Sheet>

					<div className="hidden md:flex items-center flex-row gap-3">
						<Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle Theme">
							{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
						</Button>

						{user ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-9 gap-2 rounded-full border border-transparent bg-l1 px-2 pr-3 transition-colors hover:bg-l2 hover:border-border"
									>
										<Avatar className="size-6">
											<AvatarFallback className="bg-transparent text-xs text-high-emphasis">
												<User className="size-3.5" />
											</AvatarFallback>
										</Avatar>

										<span className="max-w-24 truncate text-sm font-medium text-high-emphasis">
											{user.name}
										</span>

										<ChevronDown className="size-3.5 text-low-emphasis" />
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent
									align="end"
									className="w-64 rounded-xl border border-border bg-l1 p-1.5 shadow-lg"
								>
									<div className="flex items-center gap-3 rounded-lg px-2 py-2">
										<Avatar className="size-10">
											<AvatarFallback className="bg-l3 text-sm text-high-emphasis">
												<User className="size-5" />
											</AvatarFallback>
										</Avatar>

										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold text-high-emphasis">
												{user.name}
											</p>
											<p className="truncate text-xs text-medium-emphasis">{user.email}</p>
										</div>
									</div>

									<DropdownMenuSeparator className="my-1" />

									<DropdownMenuGroup>
										{!verified && (
											<DropdownMenuItem asChild>
												<Link to="/verify-email" className="flex w-full items-center gap-3 rounded-lg">
													<MailCheck className="size-4 text-medium-emphasis" />
													<span>Verify email</span>
												</Link>
											</DropdownMenuItem>
										)}
										<DropdownMenuItem asChild>
											<Link to="/profile" className="flex w-full items-center gap-3 rounded-lg">
												<User className="size-4 text-medium-emphasis" />
												<span>Profile & Balances</span>
											</Link>
										</DropdownMenuItem>

										<DropdownMenuItem asChild>
											<Link to="/markets" className="flex w-full items-center gap-3 rounded-lg">
												<TrendingUp className="size-4 text-medium-emphasis" />
												<span>Spot Markets</span>
											</Link>
										</DropdownMenuItem>

										<DropdownMenuItem asChild>
											<Link
												to="/trade/BTC_USD"
												className="flex w-full items-center gap-3 rounded-lg"
											>
												<Activity className="size-4 text-medium-emphasis" />
												<span>Trading Console</span>
											</Link>
										</DropdownMenuItem>
									</DropdownMenuGroup>

									<DropdownMenuSeparator className="my-1" />

									<DropdownMenuItem
										onClick={handleLogout}
										variant="red"
										className="gap-3 rounded-lg"
									>
										<LogOut className="size-4" />
										<span>Log out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<>
								<Link to="/login">
									<Button variant="ghost" size="sm" className="bg-l3">
										Log in
									</Button>
								</Link>
								<Link to="/signup">
									<Button size="sm">Sign up</Button>
								</Link>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
