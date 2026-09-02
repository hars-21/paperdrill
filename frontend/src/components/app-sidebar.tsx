import { ArrowUpRight, Database, KeyRound, LayoutDashboard, WalletCards } from "lucide-react";
import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
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

const navigation: DashboardNavItem[] = [
	{ title: "Overview", url: "/dashboard", icon: LayoutDashboard, end: true },
	{ title: "API keys", url: "/dashboard/api-keys", icon: KeyRound },
	{ title: "Balances", url: "/dashboard/balances", icon: WalletCards },
	{ title: "Account data", url: "/dashboard/data", icon: Database },
];

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
				<BrandLogo
					href="/dashboard"
					showBeta={false}
					className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"
					imageClassName="size-7"
				/>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navigation} />
				<div className="mt-auto px-2 pb-2">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Open trading" className="h-9 rounded-lg px-2.5">
								<Link to="/trade/BTC_USD">
									<ArrowUpRight />
									<span>Open trading</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
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
