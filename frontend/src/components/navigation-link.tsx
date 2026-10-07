import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Link, useLocation } from "react-router-dom";
import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavigationLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
	item: NavigationItem;
	activeClassName?: string;
};

function isActivePath(item: NavigationItem, pathname: string) {
	if (item.external) return false;

	const activePath = item.activePath ?? item.href;
	return item.end
		? pathname === activePath
		: pathname === activePath || pathname.startsWith(`${activePath}/`);
}

export const NavigationLink = forwardRef<HTMLAnchorElement, NavigationLinkProps>(
	({ item, activeClassName, className, children, ...props }, ref) => {
		const { pathname } = useLocation();
		const active = isActivePath(item, pathname);
		const resolvedClassName = cn(className, active && activeClassName);

		if (item.external) {
			return (
				<a ref={ref} href={item.href} className={resolvedClassName} {...props}>
					{children}
				</a>
			);
		}

		return (
			<Link
				ref={ref}
				to={item.href}
				aria-current={active ? "page" : undefined}
				className={resolvedClassName}
				{...props}
			>
				{children}
			</Link>
		);
	},
);

NavigationLink.displayName = "NavigationLink";
