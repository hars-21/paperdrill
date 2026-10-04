import {
	ArrowUpRight,
	BookOpen,
	Database,
	KeyRound,
	LayoutDashboard,
	Trophy,
	WalletCards,
	type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { NavMain, type DashboardNavItem } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { dashboardNavigation, dashboardUtilityNavigation } from "@/lib/navigation";
import { NavigationLink } from "@/components/navigation-link";

type SidebarNavigationId =
	| (typeof dashboardNavigation)[number]["id"]
	| (typeof dashboardUtilityNavigation)[number]["id"];

const icons: Record<SidebarNavigationId, LucideIcon> = {
	overview: LayoutDashboard,
	"api-keys": KeyRound,
	balances: WalletCards,
	"account-data": Database,
	leaderboard: Trophy,
	trading: ArrowUpRight,
	docs: BookOpen,
};

const navigation: DashboardNavItem[] = dashboardNavigation.map((item) => ({
	title: item.label,
	url: item.href,
	icon: icons[item.id],
	end: item.end,
}));

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
				<BrandLogo
					href="/dashboard"
					className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"
					imageClassName="size-7"
				/>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navigation} />
				<div className="mt-auto px-2 pb-2">
					<SidebarMenu>
						{dashboardUtilityNavigation.map((item) => {
							const Icon = icons[item.id];
							return (
								<SidebarMenuItem key={item.id}>
									<SidebarMenuButton asChild tooltip={item.label} className="h-9 rounded-lg px-2.5">
										<NavigationLink item={item}>
											<Icon />
											<span>{item.label}</span>
										</NavigationLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</div>
			</SidebarContent>
			<SidebarFooter className="border-t border-sidebar-border p-2">
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
