import { Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";

const pageNames: Record<string, string> = {
	"/dashboard": "Overview",
	"/dashboard/api-keys": "API keys",
	"/dashboard/balances": "Balances",
	"/dashboard/data": "Account data",
	"/dashboard/profile": "Profile",
};

export function DashboardLayout() {
	const { pathname } = useLocation();
	const { theme, toggleTheme } = useTheme();
	const pageName = pageNames[pathname] ?? "Dashboard";

	return (
		<SidebarProvider className="min-h-0 flex-1">
			<AppSidebar />
			<SidebarInset className="min-h-0 overflow-hidden">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 bg-l0 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-1 h-4!" />
					<Breadcrumb>
						<BreadcrumbList className="text-xs">
							<BreadcrumbItem className="text-medium-emphasis">Dashboard</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{pageName}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={toggleTheme}
						aria-label="Toggle theme"
						className="ml-auto"
					>
						{theme === "dark" ? <Sun /> : <Moon />}
					</Button>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
