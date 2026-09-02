import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export type DashboardNavItem = {
	title: string;
	url: string;
	icon: LucideIcon;
	end?: boolean;
};

export function NavMain({ items }: { items: DashboardNavItem[] }) {
	return (
		<SidebarGroup className="px-2 py-3">
			<SidebarGroupContent>
				<SidebarMenu className="gap-1">
					{items.map((item) => (
						<SidebarMenuItem key={item.url}>
							<NavLink to={item.url} end={item.end}>
								{({ isActive }) => (
									<SidebarMenuButton
										asChild
										isActive={isActive}
										tooltip={item.title}
										className="h-9 rounded-lg px-2.5 text-medium-emphasis data-[active=true]:bg-l3 data-[active=true]:text-high-emphasis"
									>
										<span>
											<item.icon />
											<span>{item.title}</span>
										</span>
									</SidebarMenuButton>
								)}
							</NavLink>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
