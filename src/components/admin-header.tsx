"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const adminPageNames: Record<string, string> = {
	"/admin": "Tableau de bord",
	"/admin/users": "Gestion des utilisateurs",
	"/admin/teams": "Gestion des équipes", 
	"/admin/leaves": "Gestion des congés",
	"/admin/audit-log": "Journal d'audit",
	"/admin/settings": "Paramètres système",
};

const getAdminPageName = (pathname: string): string => {
	return adminPageNames[pathname] || "Administration";
};

const getAdminBreadcrumbs = (pathname: string) => {
	if (pathname === "/admin") return null;
	
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length <= 1) return null;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/admin">Administration</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage className="font-medium">
						{getAdminPageName(pathname)}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
};

export function AdminHeader() {
	const pathname = usePathname();
	const pageName = getAdminPageName(pathname);
	const breadcrumbs = getAdminBreadcrumbs(pathname);

	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
				{breadcrumbs || (
					<h1 className="text-base font-medium">{pageName}</h1>
				)}
			</div>
		</header>
	);
}