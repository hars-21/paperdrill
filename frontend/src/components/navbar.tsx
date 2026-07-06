import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, Sun, Moon, User, LogOut, TrendingUp, Activity } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../lib/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Navbar() {
	const [open, setOpen] = useState(false);
	const { theme, toggleTheme } = useTheme();
	const { user, setUser } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		setUser(null);
		toast.success("Logged out successfully");
		navigate("/");
	};

	return (
		<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
				<Link to="/" className="text-lg font-semibold tracking-tight">
					Atlas
				</Link>

				<nav className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
					<Link to="/#features" className="transition-colors hover:text-high-emphasis">
						Features
					</Link>
					<Link to="/markets" className="transition-colors hover:text-high-emphasis">
						Markets
					</Link>
					<Link to="/market/BTC_USD" className="transition-colors hover:text-high-emphasis">
						Trading
					</Link>
				</nav>

				<div className="hidden items-center gap-3 sm:flex">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={toggleTheme}
						aria-label="Toggle Theme"
						className="mr-1"
					>
						{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</Button>

					{user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="gap-2 px-2.5">
									<div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs uppercase">
										{user.name[0]}
									</div>
									<span className="max-w-20 truncate text-xs font-medium">{user.name}</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56 border-border/40">
								<DropdownMenuLabel className="flex flex-col">
									<span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">
										Signed in as
									</span>
									<span className="font-semibold text-sm truncate mt-0.5">{user.name}</span>
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="border-border/30" />
								<DropdownMenuGroup>
									<DropdownMenuItem asChild>
										<Link to="/profile" className="w-full flex items-center cursor-pointer">
											<User className="mr-2 h-4 w-4 text-muted-foreground" />
											<span>Profile & Balances</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/markets" className="w-full flex items-center cursor-pointer">
											<TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
											<span>Spot Markets</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/market/BTC_USD" className="w-full flex items-center cursor-pointer">
											<Activity className="mr-2 h-4 w-4 text-muted-foreground" />
											<span>Trading Console</span>
										</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator className="border-border/30" />
								<DropdownMenuItem
									onClick={handleLogout}
									variant="destructive"
									className="cursor-pointer text-destructive"
								>
									<LogOut className="mr-2 h-4 w-4" />
									<span>Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<>
							<Link to="/login">
								<Button variant="ghost" size="sm">
									Log in
								</Button>
							</Link>
							<Link to="/signup">
								<Button size="sm">Sign up</Button>
							</Link>
						</>
					)}
				</div>

				<Button variant="ghost" size="icon-sm" className="sm:hidden" onClick={() => setOpen(!open)}>
					{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</Button>
			</div>

			{open && (
				<div className="border-t bg-background px-6 py-4 sm:hidden">
					<nav className="flex flex-col gap-3 text-sm">
						<Link
							to="/#features"
							className="text-muted-foreground hover:text-high-emphasis"
							onClick={() => setOpen(false)}
						>
							Features
						</Link>
						<Link
							to="/markets"
							className="text-muted-foreground hover:text-high-emphasis"
							onClick={() => setOpen(false)}
						>
							Markets
						</Link>
						<Link
							to="/market/BTC_USD"
							className="text-muted-foreground hover:text-high-emphasis"
							onClick={() => setOpen(false)}
						>
							Trading
						</Link>

						<div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
							<span className="text-xs text-muted-foreground">Theme</span>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={toggleTheme}
								aria-label="Toggle Theme"
							>
								{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
							</Button>
						</div>

						<div className="flex flex-col gap-2 pt-2 border-t border-border/40">
							{user ? (
								<>
									<div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
										<div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
											{user.name[0]}
										</div>
										<span>{user.name}</span>
									</div>
									<Link to="/profile" className="w-full" onClick={() => setOpen(false)}>
										<Button variant="ghost" size="sm" className="w-full justify-start gap-2">
											<User className="h-4 w-4" /> Profile & Balances
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
										<LogOut className="h-4 w-4" /> Log out
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
		</header>
	);
}
