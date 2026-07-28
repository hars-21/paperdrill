import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, Sun, Moon, User, LogOut, TrendingUp, Activity, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../lib/theme-provider";
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

export function Navbar() {
	const [open, setOpen] = useState(false);
	const { theme, toggleTheme } = useTheme();
	const { user, setUser } = useAuth();
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
			<div>
				<div className="relative flex h-14 w-full flex-col justify-center">
					<div className="grid grid-cols-[1fr_auto_1fr] items-center">
						<div className="flex items-center flex-row px-4">
							<Link to="/markets" className="text-lg font-semibold tracking-tight px-6">
								PaperDrill
							</Link>

							<Button
								variant="ghost"
								size="icon-sm"
								className="md:hidden"
								onClick={() => setOpen(!open)}
							>
								{open ? <X className="size-5" /> : <Menu className="size-5" />}
							</Button>

							<nav className="items-center justify-center flex-row hidden gap-5 sm:mx-4 md:flex lg:gap-7 xl:gap-8">
								<Link
									to="/"
									className="text-medium-emphasis hover:text-high-emphasis transition-colors"
								>
									Home
								</Link>
								<Link
									to="/markets"
									className="text-medium-emphasis hover:text-high-emphasis transition-colors"
								>
									Markets
								</Link>
								<Link
									to="/trade/BTC_USD"
									className="text-medium-emphasis hover:text-high-emphasis transition-colors"
								>
									Trading
								</Link>
							</nav>
						</div>

						<div className="col-start-3 flex justify-end">
							<div className="col-span-2 flex flex-row justify-self-end xl:col-span-1">
								<div className="flex items-center flex-row gap-3 pr-4">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={toggleTheme}
										aria-label="Toggle Theme"
									>
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
													<div className="flex size-6 items-center justify-center rounded-full bg-transparent text-xs font-semibold uppercase text-high-emphasis">
														<User />
													</div>

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
													<div className="flex size-10 items-center justify-center rounded-full bg-l3 text-sm font-semibold uppercase text-high-emphasis">
														<User />
													</div>

													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-semibold text-high-emphasis">
															{user.name}
														</p>
														<p className="truncate text-xs text-medium-emphasis">{user.email}</p>
													</div>
												</div>

												<DropdownMenuSeparator className="my-1" />

												<DropdownMenuGroup>
													<DropdownMenuItem asChild>
														<Link
															to="/profile"
															className="flex w-full items-center gap-3 rounded-lg"
														>
															<User className="size-4 text-medium-emphasis" />
															<span>Profile & Balances</span>
														</Link>
													</DropdownMenuItem>

													<DropdownMenuItem asChild>
														<Link
															to="/markets"
															className="flex w-full items-center gap-3 rounded-lg"
														>
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

						{open && (
							<div className="border-t border-border/40 px-6 py-4 sm:hidden">
								<nav className="flex flex-col gap-3 text-sm">
									<Link
										to="/"
										className="text-medium-emphasis hover:text-high-emphasis"
										onClick={() => setOpen(false)}
									>
										Home
									</Link>
									<Link
										to="/markets"
										className="text-medium-emphasis hover:text-high-emphasis"
										onClick={() => setOpen(false)}
									>
										Markets
									</Link>
									<Link
										to="/trade/BTC_USD"
										className="text-medium-emphasis hover:text-high-emphasis"
										onClick={() => setOpen(false)}
									>
										Trading
									</Link>

									<div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
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

									<div className="flex flex-col gap-2 pt-2 border-t border-border/40">
										{user ? (
											<>
												<div className="flex items-center gap-2 px-2 py-1.5 text-xs text-medium-emphasis">
													<div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
														{user.name[0]}
													</div>
													<span>{user.name}</span>
												</div>
												<Link to="/profile" className="w-full" onClick={() => setOpen(false)}>
													<Button variant="ghost" size="sm" className="w-full justify-start gap-2">
														<User className="size-4" /> Profile & Balances
													</Button>
												</Link>
												<Button
													onClick={() => {
														handleLogout();
														setOpen(false);
													}}
													variant="ghost"
													size="sm"
													className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
												>
													<LogOut className="size-4" /> Log out
												</Button>
											</>
										) : (
											<div className="flex gap-3">
												<Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
													<Button variant="ghost" size="sm" className="w-full">
														Log in
													</Button>
												</Link>
												<Link to="/signup" className="flex-1" onClick={() => setOpen(false)}>
													<Button size="sm" className="w-full">
														Sign up
													</Button>
												</Link>
											</div>
										)}
									</div>
								</nav>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
