"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams } from "../hooks/use-teams";
import { TeamsCardsView } from "./TeamsCardsView";
import { TeamDialogs } from "./TeamDialogs";
import type { TeamWithStats, CreateTeamData, UpdateTeamData } from "../types";

export function TeamManagement() {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTab, setSelectedTab] = useState("all");
	const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [selectedTeam, setSelectedTeam] = useState<TeamWithStats | null>(null);

	const {
		teams,
		loading,
		error,
		createTeam,
		updateTeam,
		deleteTeam,
		toggleTeamStatus,
		uploadTeamAvatar,
		removeTeamAvatar,
		refetch: refetchTeams,
	} = useTeams();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Filtrer les équipes selon la recherche et l'onglet sélectionné
	const filteredTeams = teams.filter((team) => {
		const matchesSearch =
			team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			team.description?.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesTab =
			selectedTab === "all" ||
			(selectedTab === "active" && team.is_active) ||
			(selectedTab === "inactive" && !team.is_active);

		return matchesSearch && matchesTab;
	});

	// Statistiques pour les badges
	const stats = {
		total: teams.length,
		active: teams.filter((t) => t.is_active).length,
		inactive: teams.filter((t) => !t.is_active).length,
	};

	const handleCreateTeam = async (teamData: CreateTeamData) => {
		try {
			const createdTeam = await createTeam(teamData);
			setIsCreateDialogOpen(false);
			return createdTeam;
		} catch (error) {
			console.error("Erreur lors de la création de l'équipe:", error);
			throw error;
		}
	};

	const handleEditTeam = (team: TeamWithStats) => {
		setSelectedTeam(team);
		setIsEditDialogOpen(true);
	};

	const handleUpdateTeam = async (teamData: UpdateTeamData) => {
		try {
			const updatedTeam = await updateTeam(teamData);
			setIsEditDialogOpen(false);
			setSelectedTeam(null);
			return updatedTeam;
		} catch (error) {
			console.error("Erreur lors de la mise à jour de l'équipe:", error);
			throw error;
		}
	};

	const handleDeleteTeam = async (teamId: string) => {
		try {
			if (confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) {
				await deleteTeam(teamId);
			}
		} catch (error) {
			console.error("Erreur lors de la suppression de l'équipe:", error);
		}
	};

	const handleToggleTeamStatus = async (teamId: string, isActive: boolean) => {
		try {
			await toggleTeamStatus(teamId, isActive);
		} catch (error) {
			console.error("Erreur lors du changement de statut:", error);
		}
	};

	if (error) {
		return (
			<div className="space-y-6">
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Filtres et recherche */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{/* Bouton mobile uniquement */}
				<Button
					onClick={() => setIsCreateDialogOpen(true)}
					className="sm:hidden w-full"
				>
					<Plus className="mr-2 h-4 w-4" />
					Créer une équipe
				</Button>
				<div className="flex-1 max-w-sm">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Rechercher une équipe..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						onClick={() => setIsCreateDialogOpen(true)}
						className="hidden sm:flex"
					>
						<Plus className="mr-2 h-4 w-4" />
						Créer une équipe
					</Button>
					<Button
						variant={viewMode === "cards" ? "default" : "outline"}
						size="sm"
						onClick={() => setViewMode("cards")}
					>
						<Grid3X3 className="h-4 w-4" />
					</Button>
					<Button
						variant={viewMode === "list" ? "default" : "outline"}
						size="sm"
						onClick={() => setViewMode("list")}
					>
						<List className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Onglets avec statistiques */}
			<Tabs
				value={selectedTab}
				onValueChange={setSelectedTab}
				className="space-y-4"
			>
				<TabsList className="grid w-full grid-cols-3 max-w-md">
					<TabsTrigger value="all" className="flex items-center gap-2">
						Toutes
						<Badge variant="secondary" className="ml-1">
							{!isMounted ? 0 : stats.total}
						</Badge>
					</TabsTrigger>
					<TabsTrigger value="active" className="flex items-center gap-2">
						Actives
						<Badge variant="secondary" className="ml-1">
							{!isMounted ? 0 : stats.active}
						</Badge>
					</TabsTrigger>
					<TabsTrigger value="inactive" className="flex items-center gap-2">
						Inactives
						<Badge variant="secondary" className="ml-1">
							{!isMounted ? 0 : stats.inactive}
						</Badge>
					</TabsTrigger>
				</TabsList>

				<TabsContent value={selectedTab} className="space-y-4">
					{loading ? (
						<div className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<div key={i} className="space-y-3">
										<Skeleton className="h-32 w-full" />
									</div>
								))}
							</div>
						</div>
					) : filteredTeams.length === 0 ? (
						<div className="text-center py-12">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
								<Filter className="h-6 w-6 text-gray-400" />
							</div>
							<h3 className="mt-4 text-lg font-semibold text-gray-900">
								Aucune équipe trouvée
							</h3>
							<p className="mt-2 text-gray-500">
								{searchTerm
									? "Aucune équipe ne correspond à votre recherche."
									: "Commencez par créer votre première équipe."}
							</p>
							{!searchTerm && (
								<Button
									className="mt-4"
									onClick={() => setIsCreateDialogOpen(true)}
								>
									<Plus className="mr-2 h-4 w-4" />
									Créer une équipe
								</Button>
							)}
						</div>
					) : (
						<TeamsCardsView
							teams={filteredTeams}
							viewMode={viewMode}
							onEditTeam={handleEditTeam}
							onDeleteTeam={handleDeleteTeam}
							onToggleStatus={handleToggleTeamStatus}
						/>
					)}
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<TeamDialogs
				isCreateOpen={isCreateDialogOpen}
				isEditOpen={isEditDialogOpen}
				selectedTeam={selectedTeam}
				onCreateOpenChange={setIsCreateDialogOpen}
				onEditOpenChange={setIsEditDialogOpen}
				onCreateTeam={handleCreateTeam}
				onUpdateTeam={handleUpdateTeam}
				onUploadTeamAvatar={uploadTeamAvatar}
				onRemoveTeamAvatar={removeTeamAvatar}
				onTeamsRefetch={refetchTeams}
			/>
		</div>
	);
}
