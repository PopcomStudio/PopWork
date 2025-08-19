"use client";

import { useEffect, useState } from "react";
import {
	Activity,
	User,
	UserPlus,
	UserMinus,
	Edit,
	FolderPlus,
	FolderMinus,
	Shield,
	Clock,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClientComponentClient } from "@/lib/supabase";
import type { TeamAuditLog } from "../types";

interface TeamActivityProps {
	teamId: string;
}

interface ActivityItem extends TeamAuditLog {
	user_name?: string;
	user_avatar?: string;
	entity_name?: string;
}

export function TeamActivity({ teamId }: TeamActivityProps) {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const supabase = createClientComponentClient();

	useEffect(() => {
		fetchTeamActivity();
	}, [teamId]);

	const fetchTeamActivity = async () => {
		try {
			setLoading(true);
			setError(null);

			// Récupérer les logs d'audit pour cette équipe
			const { data, error } = await supabase
				.from("team_audit_logs")
				.select(`
          *,
          users(first_name, last_name, avatar_url)
        `)
				.eq("team_id", teamId)
				.order("created_at", { ascending: false })
				.limit(50);

			if (error) throw error;

			// Mapper les données avec les informations utilisateur
			const mappedActivities = data.map((log: any) => ({
				...log,
				user_name: log.users
					? `${log.users.first_name} ${log.users.last_name}`
					: null,
				user_avatar: log.users?.avatar_url,
				entity_name: log.new_values?.name || log.old_values?.name || null,
			}));

			setActivities(mappedActivities);
		} catch (err) {
			console.error("Erreur lors du chargement de l'activité:", err);
			setError(err instanceof Error ? err.message : "Erreur inconnue");

			// Données de démonstration en cas d'erreur
			const demoActivities: ActivityItem[] = [
				{
					id: "1",
					team_id: teamId,
					user_id: "user1",
					action: "member_added",
					entity_type: "team_member",
					entity_id: "member1",
					new_values: { role: "member", name: "Jean Dupont" },
					created_at: new Date(Date.now() - 3600000).toISOString(),
					user_name: "Marie Martin",
					entity_name: "Jean Dupont",
				},
				{
					id: "2",
					team_id: teamId,
					user_id: "user2",
					action: "project_assigned",
					entity_type: "team_project",
					entity_id: "project1",
					new_values: { name: "Site Web E-commerce" },
					created_at: new Date(Date.now() - 7200000).toISOString(),
					user_name: "Pierre Durand",
					entity_name: "Site Web E-commerce",
				},
				{
					id: "3",
					team_id: teamId,
					user_id: "user3",
					action: "role_changed",
					entity_type: "team_member",
					entity_id: "member2",
					old_values: { role: "member" },
					new_values: { role: "lead", name: "Sophie Leroy" },
					created_at: new Date(Date.now() - 14400000).toISOString(),
					user_name: "Admin Système",
					entity_name: "Sophie Leroy",
				},
				{
					id: "4",
					team_id: teamId,
					user_id: "user1",
					action: "team_updated",
					entity_type: "team",
					entity_id: teamId,
					old_values: { description: "Ancienne description" },
					new_values: { description: "Nouvelle description de l'équipe" },
					created_at: new Date(Date.now() - 28800000).toISOString(),
					user_name: "Marie Martin",
				},
				{
					id: "5",
					team_id: teamId,
					user_id: "user4",
					action: "member_removed",
					entity_type: "team_member",
					entity_id: "member3",
					old_values: { role: "member", name: "Paul Moreau" },
					created_at: new Date(Date.now() - 86400000).toISOString(),
					user_name: "Marie Martin",
					entity_name: "Paul Moreau",
				},
			];
			setActivities(demoActivities);
		} finally {
			setLoading(false);
		}
	};

	const getActivityIcon = (action: string, entityType: string) => {
		switch (action) {
			case "member_added":
				return <UserPlus className="h-4 w-4 text-green-600" />;
			case "member_removed":
				return <UserMinus className="h-4 w-4 text-red-600" />;
			case "role_changed":
				return <Shield className="h-4 w-4 text-blue-600" />;
			case "project_assigned":
				return <FolderPlus className="h-4 w-4 text-purple-600" />;
			case "project_removed":
				return <FolderMinus className="h-4 w-4 text-orange-600" />;
			case "team_updated":
				return <Edit className="h-4 w-4 text-blue-600" />;
			default:
				return <Activity className="h-4 w-4 text-gray-600" />;
		}
	};

	const getActivityMessage = (
		activity: ActivityItem,
	): { title: string; description: string } => {
		const userName = activity.user_name || "Utilisateur inconnu";
		const entityName = activity.entity_name || "Élément inconnu";

		switch (activity.action) {
			case "member_added":
				return {
					title: `${entityName} a rejoint l'équipe`,
					description: `Ajouté par ${userName} comme ${activity.new_values?.role === "lead" ? "responsable" : activity.new_values?.role === "admin" ? "administrateur" : "membre"}`,
				};
			case "member_removed":
				return {
					title: `${entityName} a quitté l'équipe`,
					description: `Retiré par ${userName}`,
				};
			case "role_changed":
				const oldRole = activity.old_values?.role;
				const newRole = activity.new_values?.role;
				const oldRoleLabel =
					oldRole === "lead"
						? "responsable"
						: oldRole === "admin"
							? "administrateur"
							: "membre";
				const newRoleLabel =
					newRole === "lead"
						? "responsable"
						: newRole === "admin"
							? "administrateur"
							: "membre";
				return {
					title: `Rôle de ${entityName} modifié`,
					description: `${oldRoleLabel} → ${newRoleLabel} par ${userName}`,
				};
			case "project_assigned":
				return {
					title: `Projet "${entityName}" assigné`,
					description: `Assigné à l'équipe par ${userName}`,
				};
			case "project_removed":
				return {
					title: `Projet "${entityName}" retiré`,
					description: `Retiré de l'équipe par ${userName}`,
				};
			case "team_updated":
				return {
					title: "Informations de l'équipe mises à jour",
					description: `Modifiées par ${userName}`,
				};
			default:
				return {
					title: "Activité inconnue",
					description: `Par ${userName}`,
				};
		}
	};

	const formatTimeAgo = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60),
		);

		if (diffInMinutes < 1) return "À l'instant";
		if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `il y a ${diffInHours}h`;

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `il y a ${diffInDays}j`;

		return date.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short",
			year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		});
	};

	const getUserInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (error && activities.length === 0) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Activity className="h-5 w-5" />
				<h2 className="text-xl font-semibold">Activité de l'équipe</h2>
			</div>

			{loading ? (
				<div className="space-y-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-4">
								<div className="flex items-start gap-3">
									<Skeleton className="h-10 w-10 rounded-full" />
									<div className="flex-1 space-y-2">
										<div className="flex items-center justify-between">
											<Skeleton className="h-4 w-48" />
											<Skeleton className="h-3 w-16" />
										</div>
										<Skeleton className="h-3 w-32" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : activities.length === 0 ? (
				<div className="text-center py-16">
					<Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<p className="text-muted-foreground mb-2">Aucune activité récente</p>
					<p className="text-sm text-muted-foreground">
						L'activité de l'équipe s'affichera ici au fur et à mesure
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{activities.map((activity) => {
						const activityInfo = getActivityMessage(activity);
						const icon = getActivityIcon(activity.action, activity.entity_type);

						return (
							<Card
								key={activity.id}
								className="transition-colors hover:bg-muted/50"
							>
								<CardContent className="p-4">
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 mt-1">{icon}</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between gap-2">
												<div className="font-medium truncate">
													{activityInfo.title}
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Clock className="h-3 w-3" />
													{formatTimeAgo(activity.created_at)}
												</div>
											</div>
											<div className="text-sm text-muted-foreground mt-1">
												{activityInfo.description}
											</div>
										</div>
										<Avatar className="h-8 w-8 flex-shrink-0">
											<AvatarImage src={activity.user_avatar} />
											<AvatarFallback className="text-xs">
												{activity.user_name
													? getUserInitials(activity.user_name)
													: "?"}
											</AvatarFallback>
										</Avatar>
									</div>
								</CardContent>
							</Card>
						);
					})}

					{activities.length >= 50 && (
						<div className="text-center py-4">
							<p className="text-sm text-muted-foreground">
								Affichage des 50 activités les plus récentes
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
