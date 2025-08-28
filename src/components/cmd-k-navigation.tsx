"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
	Calendar,
	Clock,
	LayoutDashboard,
	FileText,
	Folder,
	History,
	Bell,
	Settings,
	Palmtree,
	Users,
	Building,
	Phone,
	UserCheck,
	FolderOpen,
	Search,
	Briefcase,
} from "lucide-react";

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
import { useTranslation } from "@/features/translation/hooks/use-translation";


// Onglets principaux de la sidebar avec clés de traduction
const mainTabsConfig = [
	{ titleKey: "navigation.dashboard", url: "/dashboard", icon: LayoutDashboard },
	{ titleKey: "navigation.projects", url: "/projects", icon: Folder },
	{ titleKey: "navigation.timeTracking", url: "/time-tracking", icon: Clock },
	{ titleKey: "navigation.invoicing", url: "/invoicing", icon: FileText },
	{ titleKey: "navigation.team", url: "/team", icon: Users },
	{ titleKey: "navigation.calendar", url: "/calendar", icon: Calendar },
	{ titleKey: "navigation.companies", url: "/entreprises", icon: Building },
	{ titleKey: "navigation.services", url: "/services", icon: Phone },
	{ titleKey: "navigation.contacts", url: "/contacts", icon: UserCheck },
	{ titleKey: "navigation.documents", url: "/documents", icon: FolderOpen },
	{ titleKey: "navigation.leaves", url: "/leaves", icon: Palmtree },
	{ titleKey: "navigation.notifications", url: "/notifications", icon: Bell },
	{ titleKey: "navigation.history", url: "/audit-log", icon: History },
	{ titleKey: "navigation.settings", url: "/settings", icon: Settings },
];


export function CmdKNavigation() {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const router = useRouter();
	const { projects } = useProjects();
	const { t } = useTranslation();

	// Créer les onglets avec les traductions
	const mainTabs = React.useMemo(() => 
		mainTabsConfig.map(tab => ({
			...tab,
			title: t(tab.titleKey)
		})),
		[t]
	);

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
				<Search className="h-4 w-4" />
				<span className="hidden sm:inline">{t('search.quickSearch')}</span>
				<span className="inline sm:hidden">{t('search.search')}</span>
				<kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
					<span className="text-xs">⌘</span>K
				</kbd>
			</button>
			<CommandDialog open={open} onOpenChange={(newOpen) => {
				setOpen(newOpen);
				if (!newOpen) setSearch("");
			}}>
				<CommandInput 
					placeholder={t('search.placeholder')} 
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList>
					<CommandEmpty>{t('search.noResults')}</CommandEmpty>
					
					{/* Afficher les onglets principaux quand aucune recherche */}
					{showMainTabs ? (
						<CommandGroup heading={t('search.navigation')}>
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
												<Briefcase className="mr-2 h-4 w-4" />
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