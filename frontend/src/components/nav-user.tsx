import { ChevronsUpDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export function NavUser() {
	const { user, setUser } = useAuth();
	const { isMobile } = useSidebar();
	const navigate = useNavigate();

	if (!user) return null;

	const handleLogout = async () => {
		try {
			await api.signout();
		} catch (error) {
			console.error("Signout failed:", error);
		} finally {
			setUser(null);
			toast.success("Logged out successfully");
			navigate("/");
		}
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="h-12 rounded-lg data-[state=open]:bg-l3 data-[state=open]:text-high-emphasis"
						>
							<Avatar className="size-8">
								<AvatarFallback className="bg-l3 font-semibold text-high-emphasis">
									{user.name.slice(0, 1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="grid min-w-0 flex-1 text-left leading-tight">
								<span className="truncate text-sm font-medium text-high-emphasis">{user.name}</span>
								<span className="truncate text-xs text-medium-emphasis">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4 text-low-emphasis" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-border bg-l1"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={6}
					>
						<DropdownMenuItem asChild>
							<Link to="/dashboard/profile">
								<UserRound /> Profile
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link to="/dashboard/api-keys">
								<KeyRound /> API keys
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="red" onClick={handleLogout}>
							<LogOut /> Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
