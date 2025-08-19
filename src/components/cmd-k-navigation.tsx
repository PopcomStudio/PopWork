"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
	IconCalendar,
	IconClock,
	IconDashboard,
	IconFileInvoice,
	IconFolder,
	IconHistory,
	IconBell,
	IconSettings,
	IconBeach,
	IconUsers,
	IconBuilding,
	IconPhone,
	IconUserCheck,
	IconFolderOpen,
	IconSearch,
} from "@tabler/icons-react";

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";

interface NavigationItem {
	title: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
	category: string;
}

const navigationItems: NavigationItem[] = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: IconDashboard,
		category: "Pages principales",
	},
	{
		title: "Projets & Tâches",
		url: "/projects",
		icon: IconFolder,
		category: "Pages principales",
	},
	{
		title: "Time Tracking",
		url: "/time-tracking",
		icon: IconClock,
		category: "Pages principales",
	},
	{
		title: "Facturation",
		url: "/invoicing",
		icon: IconFileInvoice,
		category: "Pages principales",
	},
	{
		title: "Équipe",
		url: "/team",
		icon: IconUsers,
		category: "Pages principales",
	},
	{
		title: "Calendrier",
		url: "/calendar",
		icon: IconCalendar,
		category: "Pages principales",
	},
	{
		title: "Entreprises",
		url: "/entreprises",
		icon: IconBuilding,
		category: "Clients",
	},
	{
		title: "Services",
		url: "/services",
		icon: IconPhone,
		category: "Clients",
	},
	{
		title: "Contacts",
		url: "/contacts",
		icon: IconUserCheck,
		category: "Clients",
	},
	{
		title: "Coffre-fort RH",
		url: "/documents",
		icon: IconFolderOpen,
		category: "Ressources",
	},
	{
		title: "Congés",
		url: "/leaves",
		icon: IconBeach,
		category: "Ressources",
	},
	{
		title: "Notifications",
		url: "/notifications",
		icon: IconBell,
		category: "Ressources",
	},
	{
		title: "Historique",
		url: "/audit-log",
		icon: IconHistory,
		category: "Paramètres",
	},
	{
		title: "Paramètres",
		url: "/settings",
		icon: IconSettings,
		category: "Paramètres",
	},
];

export function CmdKNavigation() {
	const [open, setOpen] = React.useState(false);
	const router = useRouter();

	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const runCommand = React.useCallback((command: () => void) => {
		setOpen(false);
		command();
	}, []);

	const groupedItems = navigationItems.reduce(
		(acc, item) => {
			if (!acc[item.category]) {
				acc[item.category] = [];
			}
			acc[item.category].push(item);
			return acc;
		},
		{} as Record<string, NavigationItem[]>,
	);

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
			>
				<IconSearch className="h-4 w-4" />
				<span className="hidden sm:inline">Recherche rapide...</span>
				<span className="inline sm:hidden">Recherche...</span>
				<kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
					<span className="text-xs">⌘</span>K
				</kbd>
			</button>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput placeholder="Rechercher une page ou un projet..." />
				<CommandList>
					<CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
					{Object.entries(groupedItems).map(([category, items], index) => (
						<React.Fragment key={category}>
							{index > 0 && <CommandSeparator />}
							<CommandGroup heading={category}>
								{items.map((item) => {
									const Icon = item.icon;
									return (
										<CommandItem
											key={item.url}
											value={`${item.title} ${item.category}`}
											onSelect={() => {
												runCommand(() => router.push(item.url));
											}}
										>
											<Icon className="mr-2 h-4 w-4" />
											<span>{item.title}</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						</React.Fragment>
					))}
				</CommandList>
			</CommandDialog>
		</>
	);
}