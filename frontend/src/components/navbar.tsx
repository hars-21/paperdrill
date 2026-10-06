import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	ChevronDown,
	Database,
	House,
	KeyRound,
	LogOut,
	MailCheck,
	Menu,
	Moon,
	Sun,
	UserRound,
	WalletCards,
	X,
	type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavigationLink } from "@/components/navigation-link";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { accountNavigation, primaryNavigation } from "@/lib/navigation";
import { useTheme } from "@/lib/theme-provider";

type AccountNavigationId = (typeof accountNavigation)[number]["id"];

const accountIcons: Record<AccountNavigationId, LucideIcon> = {
	home: House,
	portfolio: WalletCards,
	activity: Database,
	"api-keys": KeyRound,
	profile: UserRound,
};

export function Navbar() {
	const { theme, toggleTheme } = useTheme();
	const { user, verified, loading: authLoading, setUser } = useAuth();
	const [loggingOut, setLoggingOut] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const returnTo = `${location.pathname}${location.search}${location.hash}`;

	const handleLogout = async () => {
		if (loggingOut) return;
		setLoggingOut(true);
		try {
			await api.signout();
		} catch (error) {
			console.error("Signout failed:", error);
		} finally {
			setUser(null);
			toast.success("Logged out successfully");
			navigate("/", { replace: true });
			setLoggingOut(false);
		}
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur">
			<div className="flex h-14 w-full items-center px-4 sm:px-6">
				<BrandLogo href="/" />

				<nav
					className="ml-8 hidden h-full items-center gap-7 lg:flex xl:gap-8"
					aria-label="Primary navigation"
				>
					{primaryNavigation.map((item) => (
						<NavigationLink
							key={item.id}
							item={item}
							className="relative flex h-full items-center text-sm text-medium-emphasis outline-none transition-colors hover:text-high-emphasis focus-visible:text-high-emphasis"
							activeClassName="text-high-emphasis after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:content-['']"
						>
							{item.label}
						</NavigationLink>
					))}
				</nav>

				<div className="ml-auto flex items-center gap-2 sm:gap-3">
					<div className="hidden items-center gap-2 lg:flex">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={toggleTheme}
							aria-label="Toggle theme"
						>
							{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
						</Button>

						{authLoading ? (
							<Skeleton className="h-9 w-28 rounded-full" />
						) : user ? (
							<AccountMenu
								user={user}
								verified={verified}
								returnTo={returnTo}
								loggingOut={loggingOut}
								onLogout={handleLogout}
							/>
						) : (
							<>
								<Button asChild variant="ghost" size="sm">
									<Link to="/login" state={{ returnTo }}>Sign in</Link>
								</Button>
								<Button asChild size="sm">
									<Link to="/signup" state={{ returnTo }}>Start trading</Link>
								</Button>
							</>
						)}
					</div>

					<MobileNavigation
						user={user}
						verified={verified}
						authLoading={authLoading}
						returnTo={returnTo}
						theme={theme}
						toggleTheme={toggleTheme}
						loggingOut={loggingOut}
						onLogout={handleLogout}
					/>
				</div>
			</div>
		</header>
	);
}

type AuthUser = NonNullable<ReturnType<typeof useAuth>["user"]>;

function AccountMenu({
	user,
	verified,
	returnTo,
	loggingOut,
	onLogout,
}: {
	user: AuthUser;
	verified: boolean;
	returnTo: string;
	loggingOut: boolean;
	onLogout: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-9 gap-2 rounded-full border border-border/50 bg-l1 px-2 pr-3 hover:bg-l2"
					aria-label="Open account menu"
				>
					<Avatar className="size-6">
						<AvatarFallback className="bg-l3 text-xs font-semibold text-high-emphasis">
							{user.name.slice(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<span className="max-w-28 truncate text-sm font-medium text-high-emphasis">
						{user.name}
					</span>
					<ChevronDown className="size-3.5 text-low-emphasis" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-64 rounded-xl border-border bg-l1 p-1.5 shadow-lg"
			>
				<div className="flex items-center gap-3 rounded-lg px-2 py-2">
					<Avatar className="size-10">
						<AvatarFallback className="bg-l3 text-sm font-semibold text-high-emphasis">
							{user.name.slice(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-high-emphasis">{user.name}</p>
						<p className="truncate text-xs text-medium-emphasis">{user.email}</p>
					</div>
				</div>

				<DropdownMenuSeparator className="my-1" />

				<DropdownMenuGroup>
					{!verified && (
						<DropdownMenuItem asChild>
							<Link
								to="/verify-email"
								state={{ returnTo }}
								className="flex w-full items-center gap-3 rounded-lg"
							>
								<MailCheck className="size-4 text-medium-emphasis" />
								<span>Verify email</span>
							</Link>
						</DropdownMenuItem>
					)}
					{accountNavigation.map((item) => {
						const Icon = accountIcons[item.id];
						return (
							<DropdownMenuItem asChild key={item.id}>
								<NavigationLink item={item} className="flex w-full items-center gap-3 rounded-lg">
									<Icon className="size-4 text-medium-emphasis" />
									<span>{item.label}</span>
								</NavigationLink>
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>

				<DropdownMenuSeparator className="my-1" />

				<DropdownMenuItem
					onClick={onLogout}
					disabled={loggingOut}
					variant="red"
					className="gap-3 rounded-lg"
				>
					<LogOut className="size-4" />
					<span>{loggingOut ? "Logging out…" : "Log out"}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MobileNavigation({
	user,
	verified,
	authLoading,
	returnTo,
	theme,
	toggleTheme,
	loggingOut,
	onLogout,
}: {
	user: AuthUser | null;
	verified: boolean;
	authLoading: boolean;
	returnTo: string;
	theme: "light" | "dark";
	toggleTheme: () => void;
	loggingOut: boolean;
	onLogout: () => void;
}) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="lg:hidden"
					aria-label="Open menu"
				>
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
						<BrandLogo href="/" showText={false} />
					</SheetClose>
					<SheetClose asChild>
						<Button type="button" variant="ghost" size="icon-sm" aria-label="Close menu">
							<X className="size-5" />
						</Button>
					</SheetClose>
				</div>

				<nav
					className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
					aria-label="Mobile navigation"
				>
					<div className="flex flex-col gap-1">
						{primaryNavigation.map((item) => (
							<SheetClose asChild key={item.id}>
								<NavigationLink
									item={item}
									className="flex h-11 items-center rounded-lg px-3 text-sm text-medium-emphasis outline-none transition-colors hover:bg-l2 hover:text-high-emphasis focus-visible:bg-l2 focus-visible:text-high-emphasis"
									activeClassName="bg-l2 text-high-emphasis"
								>
									{item.label}
								</NavigationLink>
							</SheetClose>
						))}
					</div>

					<div className="mt-3 flex h-11 items-center justify-between border-t border-border/40 px-3 pt-3">
						<span className="text-xs text-medium-emphasis">Theme</span>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={toggleTheme}
							aria-label="Toggle theme"
						>
							{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
						</Button>
					</div>

					<div className="mt-3 flex flex-col gap-1 border-t border-border/40 pt-3">
						{authLoading ? (
							<div className="space-y-2 px-3 py-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-40" />
							</div>
						) : user ? (
							<>
								<div className="flex items-center gap-3 px-3 py-2">
									<Avatar className="size-8">
										<AvatarFallback className="bg-l3 text-xs font-semibold text-high-emphasis">
											{user.name.slice(0, 1).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-high-emphasis">{user.name}</p>
										<p className="truncate text-xs text-medium-emphasis">{user.email}</p>
									</div>
								</div>

								{!verified && (
									<SheetClose asChild>
										<Link
											to="/verify-email"
											state={{ returnTo }}
											className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-high-emphasis hover:bg-l2"
										>
											<MailCheck className="size-4 text-medium-emphasis" />
											Verify email
										</Link>
									</SheetClose>
								)}

								{accountNavigation.map((item) => {
									const Icon = accountIcons[item.id];
									return (
										<SheetClose asChild key={item.id}>
							<NavigationLink
								item={item}
								className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-high-emphasis hover:bg-l2"
								activeClassName="bg-l2"
							>
								<Icon className="size-4 text-medium-emphasis" />
								{item.label}
							</NavigationLink>
										</SheetClose>
									);
								})}

								<SheetClose asChild>
									<Button
										type="button"
										variant="ghost"
										disabled={loggingOut}
										onClick={onLogout}
										className="h-11 w-full justify-start gap-3 rounded-lg px-3 text-red-text"
									>
										<LogOut className="size-4" />
										{loggingOut ? "Logging out…" : "Log out"}
									</Button>
								</SheetClose>
							</>
						) : (
							<div className="flex flex-col gap-2">
								<SheetClose asChild>
									<Link
										to="/login"
										state={{ returnTo }}
										className="flex h-11 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-l2"
									>
										Sign in
									</Link>
								</SheetClose>
								<SheetClose asChild>
									<Link
										to="/signup"
										state={{ returnTo }}
										className="flex h-11 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
									>
										Start trading
									</Link>
								</SheetClose>
							</div>
						)}
					</div>
				</nav>
			</SheetContent>
		</Sheet>
	);
}

export default Navbar;
