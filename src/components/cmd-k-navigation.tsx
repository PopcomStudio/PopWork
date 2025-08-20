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
	IconBriefcase,
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
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Badge } from "@/components/ui/badge";


// Onglets principaux de la sidebar
const mainTabs = [
	{ title: "Dashboard", url: "/dashboard", icon: IconDashboard },
	{ title: "Projets & Tâches", url: "/projects", icon: IconFolder },
	{ title: "Time Tracking", url: "/time-tracking", icon: IconClock },
	{ title: "Facturation", url: "/invoicing", icon: IconFileInvoice },
	{ title: "Équipe", url: "/team", icon: IconUsers },
	{ title: "Calendrier", url: "/calendar", icon: IconCalendar },
	{ title: "Entreprises", url: "/entreprises", icon: IconBuilding },
	{ title: "Services", url: "/services", icon: IconPhone },
	{ title: "Contacts", url: "/contacts", icon: IconUserCheck },
	{ title: "Coffre-fort RH", url: "/documents", icon: IconFolderOpen },
	{ title: "Congés", url: "/leaves", icon: IconBeach },
	{ title: "Notifications", url: "/notifications", icon: IconBell },
	{ title: "Historique", url: "/audit-log", icon: IconHistory },
	{ title: "Paramètres", url: "/settings", icon: IconSettings },
];


export function CmdKNavigation() {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const router = useRouter();
	const { projects } = useProjects();

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
		setSearch("");
		command();
	}, []);

	// Filtrer les projets basé sur la recherche
	const filteredProjects = React.useMemo(() => {
		if (!search.trim()) return [];
		
		const searchLower = search.toLowerCase();
		return projects
			.filter(project => 
				project.name.toLowerCase().includes(searchLower) ||
				project.company_name?.toLowerCase().includes(searchLower) ||
				project.service_name?.toLowerCase().includes(searchLower)
			)
			.slice(0, 10);
	}, [projects, search]);

	// Filtrer les onglets basé sur la recherche
	const filteredTabs = React.useMemo(() => {
		if (!search.trim()) return [];
		
		const searchLower = search.toLowerCase();
		return mainTabs.filter(tab =>
			tab.title.toLowerCase().includes(searchLower)
		);
	}, [search]);

	// Détermine si on affiche les onglets ou les résultats de recherche
	const showMainTabs = !search.trim();

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
			<CommandDialog open={open} onOpenChange={(newOpen) => {
				setOpen(newOpen);
				if (!newOpen) setSearch("");
			}}>
				<CommandInput 
					placeholder="Rechercher une page ou un projet..." 
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList>
					<CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
					
					{/* Afficher les onglets principaux quand aucune recherche */}
					{showMainTabs ? (
						<CommandGroup heading="Navigation">
							{mainTabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<CommandItem
										key={tab.url}
										value={tab.title}
										onSelect={() => {
											runCommand(() => router.push(tab.url));
										}}
									>
										<Icon className="mr-2 h-4 w-4" />
										<span>{tab.title}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					) : (
						<>
							{/* Section Projets - affichée en premier */}
							{filteredProjects.length > 0 && (
								<>
									<CommandGroup heading="Projets">
										{filteredProjects.map((project) => (
											<CommandItem
												key={`project-${project.id}`}
												value={`projet ${project.name} ${project.company_name} ${project.service_name}`}
												onSelect={() => {
													runCommand(() => router.push(`/projects/${project.id}`));
												}}
											>
												<IconBriefcase className="mr-2 h-4 w-4" />
												<div className="flex flex-1 items-center justify-between">
													<div className="flex flex-col">
														<span>{project.name}</span>
														{(project.company_name || project.service_name) && (
															<span className="text-xs text-muted-foreground">
																{project.company_name} 
																{project.company_name && project.service_name && " • "}
																{project.service_name}
															</span>
														)}
													</div>
													<Badge 
														variant={
															project.status === 'active' ? 'default' :
															project.status === 'completed' ? 'secondary' :
															project.status === 'archived' ? 'outline' :
															'secondary'
														}
														className="ml-2"
													>
														{project.status === 'active' ? 'Actif' :
														 project.status === 'completed' ? 'Terminé' :
														 project.status === 'archived' ? 'Archivé' :
														 'Brouillon'}
													</Badge>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
									{filteredTabs.length > 0 && <CommandSeparator />}
								</>
							)}
							
							{/* Section Pages - affichée après les projets */}
							{filteredTabs.length > 0 && (
								<CommandGroup heading="Pages">
									{filteredTabs.map((tab) => {
										const Icon = tab.icon;
										return (
											<CommandItem
												key={tab.url}
												value={tab.title}
												onSelect={() => {
													runCommand(() => router.push(tab.url));
												}}
											>
												<Icon className="mr-2 h-4 w-4" />
												<span>{tab.title}</span>
											</CommandItem>
										);
									})}
								</CommandGroup>
							)}
							
							{/* Message si aucun résultat */}
							{filteredProjects.length === 0 && filteredTabs.length === 0 && (
								<div className="py-6 text-center text-sm text-muted-foreground">
									Aucun résultat trouvé pour "{search}"
								</div>
							)}
						</>
					)}
				</CommandList>
			</CommandDialog>
		</>
	);
}