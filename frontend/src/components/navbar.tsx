import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	ArrowRight,
	ArrowUpRight,
	BarChart3,
	BookOpenText,
	ChartCandlestick,
	ChevronDown,
	Database,
	House,
	KeyRound,
	LogOut,
	MailCheck,
	Menu,
	Moon,
	Sun,
	Trophy,
	UserRound,
	WalletCards,
	X,
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
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useLastTradePath } from "@/hooks/use-ux-preferences";
import { api } from "@/lib/api";
import { accountNavigation, getPrimaryNavigation } from "@/lib/navigation";
import { useTheme } from "@/lib/theme-provider";
import type { Portfolio } from "@/types";
import { formatPrice } from "@/utils/format";

const accountIcons = {
	home: House,
	portfolio: WalletCards,
	activity: Database,
	"api-keys": KeyRound,
	profile: UserRound,
};

const accountDescriptions = {
	home: "Account overview",
	portfolio: "Balances and performance",
	activity: "Open orders and trade history",
	"api-keys": "Connect your trading bot",
	profile: "Profile and account settings",
};

const primaryNavigationMeta = {
	trading: { description: "Open the live terminal", icon: ChartCandlestick },
	markets: { description: "Browse tradable pairs", icon: BarChart3 },
	leaderboard: { description: "View global rankings", icon: Trophy },
	docs: { description: "Build with the API", icon: BookOpenText },
};

type BalanceSnapshot = {
	available: string | null;
	balance: string | null;
	returnValue: string | null;
};

function getBalanceSnapshot(portfolio: Portfolio | null): BalanceSnapshot {
	if (!portfolio) {
		return { available: null, balance: null, returnValue: null };
	}

	const quotePosition = portfolio.positions.find(
		(position) => position.asset === portfolio.quoteAsset,
	);
	const returnNumber = Number(portfolio.pnlPercent);

	return {
		available: quotePosition
			? `${formatPrice(quotePosition.available)} ${portfolio.quoteAsset}`
			: null,
		balance: `${formatPrice(portfolio.equity)} ${portfolio.quoteAsset}`,
		returnValue: Number.isFinite(returnNumber)
			? `${returnNumber > 0 ? "+" : ""}${returnNumber.toFixed(2)}%`
			: null,
	};
}

export function Navbar() {
	const { theme, toggleTheme } = useTheme();
	const { user, verified, loading: authLoading, setUser } = useAuth();
	const { portfolio, loading: portfolioLoading } = usePortfolio({ enabled: Boolean(user) });
	const [loggingOut, setLoggingOut] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const lastTradePath = useLastTradePath();
	const primaryNavigation = getPrimaryNavigation(lastTradePath);
	const returnTo = `${location.pathname}${location.search}${location.hash}`;
	const balance = getBalanceSnapshot(portfolio);

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
		<header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
			<div className="mx-auto flex h-16 w-full max-w-384 items-center px-4 sm:px-6 lg:px-8">
				<BrandLogo href="/" />

				<nav
					className="ml-9 hidden h-full items-center gap-7 lg:flex xl:ml-12 xl:gap-9"
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

				<div className="ml-auto flex items-center gap-2">
					<div className="hidden items-center gap-2 lg:flex">
						{authLoading ? (
							<>
								<ThemeButton theme={theme} onToggle={toggleTheme} />
								<Skeleton className="h-10 w-28 rounded-lg" />
							</>
						) : user ? (
							<>
								<DesktopBalance balance={balance.balance} loading={portfolioLoading} />
								<div className="mx-1 h-6 w-px bg-border/70" aria-hidden="true" />
								<ThemeButton theme={theme} onToggle={toggleTheme} />
								<AccountMenu
									user={user}
									verified={verified}
									returnTo={returnTo}
									balance={balance}
									balanceLoading={portfolioLoading}
									loggingOut={loggingOut}
									onLogout={handleLogout}
								/>
							</>
						) : (
							<>
								<ThemeButton theme={theme} onToggle={toggleTheme} />
								<Button asChild variant="ghost" size="sm" className="ml-1 px-3.5">
									<Link to="/login" state={{ returnTo }}>
										Sign in
									</Link>
								</Button>
								<Button asChild size="sm" className="px-4">
									<Link to="/signup" state={{ returnTo }}>
										Start trading
									</Link>
								</Button>
							</>
						)}
					</div>

					{user ? <MobileBalance balance={balance.balance} loading={portfolioLoading} /> : null}

					<MobileNavigation
						primaryNavigation={primaryNavigation}
						user={user}
						verified={verified}
						authLoading={authLoading}
						returnTo={returnTo}
						theme={theme}
						toggleTheme={toggleTheme}
						balance={balance}
						balanceLoading={portfolioLoading}
						loggingOut={loggingOut}
						onLogout={handleLogout}
					/>
				</div>
			</div>
		</header>
	);
}

function ThemeButton({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className="rounded-lg text-medium-emphasis hover:text-high-emphasis"
			onClick={onToggle}
			aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
		>
			{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
		</Button>
	);
}

function DesktopBalance({ balance, loading }: { balance: string | null; loading: boolean }) {
	return (
		<Link
			to="/portfolio"
			className="flex h-10 w-40 flex-col justify-center rounded-lg px-3 outline-none transition-colors hover:bg-l2 focus-visible:bg-l2"
			aria-label={balance ? `View balance: ${balance}` : "View portfolio balance"}
		>
			<span className="text-[11px] leading-none text-medium-emphasis">Balance</span>
			{loading ? (
				<Skeleton className="mt-1.5 h-3.5 w-24" />
			) : (
				<span className="mt-1 truncate text-sm font-semibold leading-none text-high-emphasis tabular-nums">
					{balance ?? "Unavailable"}
				</span>
			)}
		</Link>
	);
}

function MobileBalance({ balance, loading }: { balance: string | null; loading: boolean }) {
	return (
		<Link
			to="/portfolio"
			className="hidden h-9 max-w-28 items-center rounded-lg px-2.5 text-xs font-semibold text-high-emphasis outline-none hover:bg-l2 focus-visible:bg-l2 min-[390px]:flex lg:hidden"
			aria-label={balance ? `View balance: ${balance}` : "View portfolio balance"}
		>
			{loading ? (
				<Skeleton className="h-3.5 w-20" />
			) : (
				<span className="truncate">{balance ?? "Balance"}</span>
			)}
		</Link>
	);
}

type AuthUser = NonNullable<ReturnType<typeof useAuth>["user"]>;

function AccountMenu({
	user,
	verified,
	returnTo,
	balance,
	balanceLoading,
	loggingOut,
	onLogout,
}: {
	user: AuthUser;
	verified: boolean;
	returnTo: string;
	balance: BalanceSnapshot;
	balanceLoading: boolean;
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
					className="group h-10 gap-2 rounded-lg border border-border/60 bg-l1 px-2 hover:border-border hover:bg-l2 xl:pr-3"
					aria-label="Open account menu"
				>
					<Avatar className="size-7">
						<AvatarFallback className="bg-l3 text-xs font-semibold text-high-emphasis dark:bg-background">
							{user.name.slice(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<span className="hidden max-w-28 truncate text-sm font-medium text-high-emphasis xl:block">
						{user.name}
					</span>
					<ChevronDown className="size-3.5 text-low-emphasis transition-transform group-data-[state=open]:rotate-180" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				sideOffset={10}
				className="w-84 rounded-2xl border-border/70 bg-l1 p-2 shadow-[0_20px_60px_-28px_rgba(9,9,11,0.45)] dark:shadow-[0_20px_60px_-28px_rgba(8,8,12,0.8)]"
			>
				<div className="flex items-center gap-3 px-3 py-3">
					<Avatar className="size-10">
						<AvatarFallback className="bg-l3 text-sm font-semibold text-high-emphasis">
							{user.name.slice(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-high-emphasis">{user.name}</p>
						<p className="mt-0.5 truncate text-xs text-medium-emphasis">{user.email}</p>
					</div>
				</div>

				<DropdownMenuItem
					asChild
					className="flex-col items-stretch gap-0 rounded-xl p-0 focus:bg-l2"
				>
					<Link
						to="/portfolio"
						className="flex w-full flex-col items-stretch gap-0 rounded-xl border border-border/60 bg-l2 p-3"
					>
						<div className="flex items-center justify-between gap-3">
							<span className="text-xs text-medium-emphasis">Portfolio balance</span>
							<ArrowUpRight className="size-3.5 text-low-emphasis" />
						</div>
						{balanceLoading ? (
							<Skeleton className="mt-2 h-5 w-32" />
						) : (
							<p className="mt-1.5 text-lg font-semibold tracking-tight text-high-emphasis tabular-nums">
								{balance.balance ?? "Unavailable"}
							</p>
						)}
						<div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-2.5 text-xs">
							<div>
								<p className="text-medium-emphasis">Available</p>
								<p className="mt-1 truncate font-medium text-high-emphasis tabular-nums">
									{balanceLoading ? "Loading" : (balance.available ?? "Unavailable")}
								</p>
							</div>
							<div>
								<p className="text-medium-emphasis">All-time return</p>
								<p className="mt-1 font-medium text-high-emphasis tabular-nums">
									{balanceLoading ? "Loading" : (balance.returnValue ?? "Unavailable")}
								</p>
							</div>
						</div>
					</Link>
				</DropdownMenuItem>

				{!verified ? (
					<DropdownMenuItem asChild className="mt-1 rounded-lg p-0 focus:bg-primary/10">
						<Link
							to="/verify-email"
							state={{ returnTo }}
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-primary"
						>
							<MailCheck className="size-4" />
							<span className="text-sm font-medium">Verify your email</span>
						</Link>
					</DropdownMenuItem>
				) : null}

				<DropdownMenuSeparator className="my-2" />

				<DropdownMenuGroup className="space-y-0.5">
					{accountNavigation.map((item) => {
						const Icon = accountIcons[item.id];
						return (
							<DropdownMenuItem asChild key={item.id} className="rounded-lg p-0 focus:bg-l2">
								<NavigationLink
									item={item}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
								>
									<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-medium-emphasis">
										<Icon className="size-4" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-medium text-high-emphasis">
											{item.label}
										</span>
										<span className="mt-0.5 block truncate text-xs text-medium-emphasis">
											{accountDescriptions[item.id]}
										</span>
									</span>
									<ArrowRight className="size-3.5 text-low-emphasis" />
								</NavigationLink>
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>

				<DropdownMenuSeparator className="my-2" />

				<DropdownMenuItem
					onClick={onLogout}
					disabled={loggingOut}
					variant="red"
					className="h-10 gap-3 rounded-lg px-3"
				>
					<LogOut className="size-4" />
					<span>{loggingOut ? "Logging out…" : "Log out"}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MobileNavigation({
	primaryNavigation,
	user,
	verified,
	authLoading,
	returnTo,
	theme,
	toggleTheme,
	balance,
	balanceLoading,
	loggingOut,
	onLogout,
}: {
	primaryNavigation: ReturnType<typeof getPrimaryNavigation>;
	user: AuthUser | null;
	verified: boolean;
	authLoading: boolean;
	returnTo: string;
	theme: "light" | "dark";
	toggleTheme: () => void;
	balance: BalanceSnapshot;
	balanceLoading: boolean;
	loggingOut: boolean;
	onLogout: () => void;
}) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-lg"
					className="rounded-lg border border-border/60 bg-l1 lg:hidden"
					aria-label="Open navigation"
				>
					<Menu className="size-5" />
				</Button>
			</SheetTrigger>

			<SheetContent
				side="right"
				showCloseButton={false}
				className="h-dvh w-full max-w-none gap-0 border-l-0 bg-background p-0 data-[state=closed]:duration-200 data-[state=open]:duration-300 sm:w-104 sm:max-w-[calc(100vw-1rem)] sm:border-l"
			>
				<SheetTitle className="sr-only">Navigation</SheetTitle>

				<div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-4 sm:px-5">
					<SheetClose asChild>
						<BrandLogo href="/" />
					</SheetClose>
					<SheetClose asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							className="rounded-lg border border-border/60 bg-l1"
							aria-label="Close navigation"
						>
							<X className="size-5" />
						</Button>
					</SheetClose>
				</div>

				<nav
					className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5"
					aria-label="Mobile navigation"
				>
					<section aria-labelledby="explore-navigation">
						<h2 id="explore-navigation" className="mb-3 text-sm font-semibold text-high-emphasis">
							Explore
						</h2>
						<div className="grid grid-cols-2 gap-2">
							{primaryNavigation.map((item) => {
								const meta = primaryNavigationMeta[item.id];
								const Icon = meta.icon;
								return (
									<SheetClose asChild key={item.id}>
										<NavigationLink
											item={item}
											className="group flex min-h-30 flex-col rounded-xl border border-border/60 bg-l1 p-4 outline-none transition-[background-color,border-color,transform] hover:border-border hover:bg-l2 focus-visible:bg-l2 active:scale-[0.98]"
											activeClassName="border-primary/35 bg-primary/5"
										>
											<div className="flex items-start justify-between gap-3">
												<Icon className="size-5 text-primary" />
												{item.external ? (
													<ArrowUpRight className="size-4 text-low-emphasis" />
												) : (
													<ArrowRight className="size-4 text-low-emphasis transition-transform group-hover:translate-x-0.5" />
												)}
											</div>
											<span className="mt-auto block text-base font-semibold text-high-emphasis">
												{item.label}
											</span>
											<span className="mt-1 block text-xs leading-5 text-medium-emphasis">
												{meta.description}
											</span>
										</NavigationLink>
									</SheetClose>
								);
							})}
						</div>
					</section>

					<section
						className="mt-7 border-t border-border/60 pt-6"
						aria-labelledby="account-navigation"
					>
						<h2 id="account-navigation" className="mb-3 text-sm font-semibold text-high-emphasis">
							Your account
						</h2>

						{authLoading ? (
							<div className="rounded-2xl border border-border/60 bg-l1 p-4">
								<div className="flex items-center gap-3">
									<Skeleton className="size-10 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-3 w-44 max-w-full" />
									</div>
								</div>
								<Skeleton className="mt-5 h-16 w-full rounded-lg" />
							</div>
						) : user ? (
							<MobileAccount
								user={user}
								verified={verified}
								returnTo={returnTo}
								balance={balance}
								balanceLoading={balanceLoading}
							/>
						) : (
							<div className="rounded-2xl border border-border/60 bg-l1 p-4">
								<h3 className="font-semibold text-high-emphasis">Start your trading record</h3>
								<p className="mt-1.5 text-sm leading-6 text-medium-emphasis">
									Create an account to track your balance, performance, and rank.
								</p>
								<div className="mt-4 grid grid-cols-2 gap-2">
									<SheetClose asChild>
										<Link
											to="/login"
											state={{ returnTo }}
											className="flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-high-emphasis outline-none hover:bg-l2 focus-visible:bg-l2"
										>
											Sign in
										</Link>
									</SheetClose>
									<SheetClose asChild>
										<Link
											to="/signup"
											state={{ returnTo }}
											className="flex h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:brightness-95"
										>
											Start trading
										</Link>
									</SheetClose>
								</div>
							</div>
						)}
					</section>
				</nav>

				<div className="safe-area-bottom flex shrink-0 items-center gap-2 border-t border-border/60 bg-background px-4 py-3 sm:px-5">
					<Button
						type="button"
						variant="ghost"
						onClick={toggleTheme}
						className="h-10 flex-1 justify-start rounded-lg px-3 text-medium-emphasis"
						aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
					>
						{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
						{theme === "dark" ? "Light theme" : "Dark theme"}
					</Button>
					{user ? (
						<SheetClose asChild>
							<Button
								type="button"
								variant="ghost"
								disabled={loggingOut}
								onClick={onLogout}
								className="h-10 flex-1 justify-end rounded-lg px-3 text-red-text hover:bg-red-bg/20 hover:text-red-text"
							>
								<LogOut className="size-4" />
								{loggingOut ? "Logging out…" : "Log out"}
							</Button>
						</SheetClose>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function MobileAccount({
	user,
	verified,
	returnTo,
	balance,
	balanceLoading,
}: {
	user: AuthUser;
	verified: boolean;
	returnTo: string;
	balance: BalanceSnapshot;
	balanceLoading: boolean;
}) {
	return (
		<>
			<div className="overflow-hidden rounded-2xl border border-border/60 bg-l1">
				<div className="flex items-center gap-3 px-4 py-4">
					<Avatar className="size-10">
						<AvatarFallback className="bg-l3 text-sm font-semibold text-high-emphasis">
							{user.name.slice(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-high-emphasis">{user.name}</p>
						<p className="mt-0.5 truncate text-xs text-medium-emphasis">{user.email}</p>
					</div>
					<SheetClose asChild>
						<Link
							to="/settings/profile"
							className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-medium-emphasis outline-none hover:bg-l2 hover:text-high-emphasis focus-visible:bg-l2"
							aria-label="Open profile settings"
						>
							<UserRound className="size-4" />
							Profile
						</Link>
					</SheetClose>
				</div>

				<SheetClose asChild>
					<Link
						to="/portfolio"
						className="block border-t border-border/50 bg-l2/40 px-4 py-4 outline-none hover:bg-l2 focus-visible:bg-l2"
					>
						<div className="flex items-center justify-between gap-3">
							<span className="text-xs text-medium-emphasis">Portfolio balance</span>
							<ArrowRight className="size-4 text-low-emphasis" />
						</div>
						{balanceLoading ? (
							<Skeleton className="mt-2 h-6 w-40" />
						) : (
							<p className="mt-1.5 text-xl font-semibold tracking-tight text-high-emphasis tabular-nums">
								{balance.balance ?? "Unavailable"}
							</p>
						)}
						<div className="mt-3 flex items-center justify-between gap-4 text-xs">
							<p className="min-w-0 text-medium-emphasis">
								Available{" "}
								<span className="ml-1 text-high-emphasis tabular-nums">
									{balanceLoading ? "Loading" : (balance.available ?? "Unavailable")}
								</span>
							</p>
							<p className="shrink-0 font-medium text-high-emphasis tabular-nums">
								{balanceLoading ? "Loading" : (balance.returnValue ?? "Unavailable")}
							</p>
						</div>
					</Link>
				</SheetClose>
			</div>

			{!verified ? (
				<SheetClose asChild>
					<Link
						to="/verify-email"
						state={{ returnTo }}
						className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm font-medium text-primary outline-none hover:bg-primary/10 focus-visible:bg-primary/10"
					>
						<MailCheck className="size-4" />
						Verify your email
					</Link>
				</SheetClose>
			) : null}

			<div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-l1">
				{accountNavigation
					.filter((item) => item.id !== "profile")
					.map((item, index) => {
						const Icon = accountIcons[item.id];
						return (
							<SheetClose asChild key={item.id}>
								<NavigationLink
									item={item}
									className={`flex min-h-16 items-center gap-3 px-3.5 py-2.5 outline-none transition-colors hover:bg-l2 focus-visible:bg-l2 ${index > 0 ? "border-t border-border/50" : ""}`}
									activeClassName="bg-primary/5"
								>
									<span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background text-medium-emphasis">
										<Icon className="size-4" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-medium text-high-emphasis">
											{item.label}
										</span>
										<span className="mt-0.5 block truncate text-xs text-medium-emphasis">
											{accountDescriptions[item.id]}
										</span>
									</span>
									<ArrowRight className="size-4 text-low-emphasis" />
								</NavigationLink>
							</SheetClose>
						);
					})}
			</div>
		</>
	);
}

export default Navbar;
