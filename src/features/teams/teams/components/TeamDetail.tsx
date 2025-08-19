"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	Edit,
	Users,
	FolderOpen,
	Activity,
	Info,
	Settings,
	UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeams } from "../hooks/use-teams";
import { useTeamMembers } from "../hooks/use-team-members";
import { useTeamProjects } from "../hooks/use-team-projects";
import { TeamMembersList } from "./TeamMembersList";
import { TeamProjectsList } from "./TeamProjectsList";
import { TeamActivity } from "./TeamActivity";
import type { TeamWithStats } from "../types";

interface TeamDetailProps {
	teamId: string;
}

export function TeamDetail({ teamId }: TeamDetailProps) {
	const router = useRouter();
	const { teams, loading: teamsLoading, error: teamsError } = useTeams();
	const { members, loading: membersLoading } = useTeamMembers(teamId);
	const { teamProjects, loading: projectsLoading } = useTeamProjects(teamId);

	const [team, setTeam] = useState<TeamWithStats | null>(null);

	useEffect(() => {
		if (!teamsLoading && teams.length > 0) {
			const foundTeam = teams.find((t) => t.id === teamId);
			if (foundTeam) {
				setTeam(foundTeam);
			}
		}
	}, [teams, teamsLoading, teamId]);

	if (teamsLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-9 w-24" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-48" />
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					<div className="space-y-4">
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
					<div className="lg:col-span-3">
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
			</div>
		);
	}

	if (teamsError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{teamsError}</AlertDescription>
			</Alert>
		);
	}

	if (!team) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button variant="ghost" onClick={() => router.push("/teams")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Retour aux équipes
					</Button>
				</div>
				<Alert>
					<AlertDescription>Équipe non trouvée</AlertDescription>
				</Alert>
			</div>
		);
	}

	const getTeamInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className="space-y-6">
			{/* En-tête avec bouton retour */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" onClick={() => router.push("/teams")}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Retour aux équipes
				</Button>
			</div>

			{/* Header de l'équipe */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-4">
					<Avatar className="h-16 w-16">
						{team.avatar_url ? (
							<AvatarImage src={team.avatar_url} alt={team.name} />
						) : (
							<AvatarFallback
								className="text-xl font-bold"
								style={{
									backgroundColor: team.color || "#6366f1",
									color: "white",
								}}
							>
								{getTeamInitials(team.name)}
							</AvatarFallback>
						)}
					</Avatar>
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							{team.name}
							<Badge variant={team.is_active ? "default" : "secondary"}>
								{team.is_active ? "Active" : "Inactive"}
							</Badge>
						</h1>
						{team.description && (
							<p className="text-muted-foreground mt-1">{team.description}</p>
						)}
					</div>
				</div>
				<Button variant="outline">
					<Edit className="h-4 w-4 mr-2" />
					Modifier l'équipe
				</Button>
			</div>

			{/* Statistiques rapides */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<Users className="h-5 w-5 text-blue-600" />
							<div>
								<div className="text-2xl font-bold">{team.member_count}</div>
								<div className="text-sm text-muted-foreground">Membres</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<UserCheck className="h-5 w-5 text-green-600" />
							<div>
								<div className="text-2xl font-bold">{team.lead_count}</div>
								<div className="text-sm text-muted-foreground">
									Responsables
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<FolderOpen className="h-5 w-5 text-purple-600" />
							<div>
								<div className="text-2xl font-bold">{team.project_count}</div>
								<div className="text-sm text-muted-foreground">Projets</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<Activity className="h-5 w-5 text-orange-600" />
							<div>
								<div className="text-xs text-muted-foreground">
									Dernière activité
								</div>
								<div className="text-sm font-medium">
									{team.last_activity
										? new Date(team.last_activity).toLocaleDateString("fr-FR", {
												day: "numeric",
												month: "short",
											})
										: "Aucune"}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Onglets de navigation */}
			<Tabs defaultValue="members" className="w-full">
				<TabsList className="grid grid-cols-3 max-w-md">
					<TabsTrigger value="members" className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						Membres ({members.length})
					</TabsTrigger>
					<TabsTrigger value="projects" className="flex items-center gap-2">
						<FolderOpen className="h-4 w-4" />
						Projets ({teamProjects.length})
					</TabsTrigger>
					<TabsTrigger value="activity" className="flex items-center gap-2">
						<Activity className="h-4 w-4" />
						Activité
					</TabsTrigger>
				</TabsList>

				{/* Onglet Membres */}
				<TabsContent value="members" className="space-y-6 mt-6">
					<TeamMembersList teamId={teamId} />
				</TabsContent>

				{/* Onglet Projets */}
				<TabsContent value="projects" className="space-y-6 mt-6">
					<TeamProjectsList teamId={teamId} />
				</TabsContent>

				{/* Onglet Activité */}
				<TabsContent value="activity" className="space-y-6 mt-6">
					<TeamActivity teamId={teamId} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
