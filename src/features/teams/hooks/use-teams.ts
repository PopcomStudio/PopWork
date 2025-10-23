"use client";

import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@/lib/supabase";
import { compressImage, validateImageFile } from "@/lib/image-utils";
import type {
	Team,
	TeamWithStats,
	CreateTeamData,
	UpdateTeamData,
} from "../types";

// Types pour les données Supabase
interface SupabaseTeam {
	id: string;
	name: string;
	description: string | null;
	color: string | null;
	avatar_url: string | null;
	is_active: boolean;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	team_members: Array<{ id: string; role: string; is_active: boolean }>;
	team_project_assignments: Array<{ id: string; is_active: boolean }>;
}

export function useTeams() {
	const [teams, setTeams] = useState<TeamWithStats[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const supabase = createClientComponentClient();

	// Récupérer toutes les équipes avec leurs statistiques
	const fetchTeams = useCallback(async () => {
		try {
			setError(null);

			// Récupérer les équipes avec leurs statistiques calculées
			const { data, error } = await supabase
				.from("teams")
				.select(`
          id,
          name,
          description,
          color,
          avatar_url,
          is_active,
          created_by,
          created_at,
          updated_at,
          deleted_at,
          team_members(
            id,
            is_active
          ),
          team_project_assignments(
            id,
            is_active
          )
        `)
				.is("deleted_at", null)
				.order("created_at", { ascending: false });

			if (error) throw error;

			// Mapper les équipes avec les statistiques réelles
			const mappedTeams = (data || []).map((team: any) => {
				const memberCount = team.team_members
					? team.team_members.filter((m: any) => m.is_active).length
					: 0;
				const projectCount = team.team_project_assignments
					? team.team_project_assignments.filter((p: any) => p.is_active).length
					: 0;

				return {
					id: team.id,
					name: team.name,
					description: team.description,
					color: team.color,
					avatar_url: team.avatar_url,
					is_active: team.is_active,
					created_by: team.created_by,
					created_at: team.created_at,
					updated_at: team.updated_at,
					deleted_at: team.deleted_at,
					member_count: memberCount,
					project_count: projectCount,
					lead_count: 0,
					last_activity: team.updated_at,
				};
			});

			setTeams(mappedTeams);
		} catch (err) {
			console.error("Erreur lors du chargement des équipes:", err);
			setError(err instanceof Error ? err.message : "Erreur inconnue");
		} finally {
			setLoading(false);
		}
	}, [supabase]);

	// Créer une nouvelle équipe
	const createTeam = async (teamData: CreateTeamData) => {
		try {
			setError(null);
			const { data, error } = await supabase
				.from("teams")
				.insert([
					{
						name: teamData.name,
						description: teamData.description || null,
						color: teamData.color || null,
						avatar_url: teamData.avatar_url || null,
						is_active: teamData.is_active ?? true,
					},
				])
				.select(`
          id,
          name,
          description,
          color,
          avatar_url,
          is_active,
          created_by,
          created_at,
          updated_at,
          deleted_at
        `)
				.single();

			if (error) throw error;

			const newTeam: TeamWithStats = {
				...data,
				member_count: 0,
				project_count: 0,
				lead_count: 0,
				last_activity: data.updated_at,
			};

			// Refetch pour avoir les données à jour
			await fetchTeams();
			return newTeam;
		} catch (err) {
			console.error("Erreur lors de la création de l'équipe:", err);
			throw err;
		}
	};

	// Mettre à jour une équipe
	const updateTeam = async (teamData: UpdateTeamData) => {
		try {
			setError(null);
			const { data, error } = await supabase
				.from("teams")
				.update({
					name: teamData.name,
					description: teamData.description || null,
					color: teamData.color || null,
					avatar_url: teamData.avatar_url || null,
					is_active: teamData.is_active ?? true,
				})
				.eq("id", teamData.id)
				.select(`
          id,
          name,
          description,
          color,
          avatar_url,
          is_active,
          created_by,
          created_at,
          updated_at,
          deleted_at
        `)
				.single();

			if (error) throw error;

			const updatedTeam: TeamWithStats = {
				id: data.id,
				name: data.name,
				description: data.description,
				color: data.color,
				avatar_url: data.avatar_url,
				is_active: data.is_active,
				created_by: data.created_by,
				created_at: data.created_at,
				updated_at: data.updated_at,
				deleted_at: data.deleted_at,
				member_count: 0, // À calculer plus tard
				project_count: 0, // À calculer plus tard
				lead_count: 0, // À calculer plus tard
				last_activity: data.updated_at,
			};

			// Refetch pour avoir les données à jour avec les compteurs
			await fetchTeams();
			return updatedTeam;
		} catch (err) {
			console.error("Erreur lors de la mise à jour de l'équipe:", err);
			throw err;
		}
	};

	// Supprimer une équipe (vrai delete)
	const deleteTeam = async (teamId: string) => {
		try {
			setError(null);
			const { error } = await supabase.from("teams").delete().eq("id", teamId);

			if (error) throw error;

			// Refetch pour avoir la liste à jour
			await fetchTeams();
		} catch (err) {
			console.error("Erreur lors de la suppression de l'équipe:", err);
			throw err;
		}
	};

	// Activer/désactiver une équipe
	const toggleTeamStatus = async (teamId: string, isActive: boolean) => {
		try {
			setError(null);
			const { error } = await supabase
				.from("teams")
				.update({ is_active: isActive })
				.eq("id", teamId);

			if (error) throw error;

			// Refetch pour avoir les données à jour
			await fetchTeams();
		} catch (err) {
			console.error("Erreur lors du changement de statut de l'équipe:", err);
			throw err;
		}
	};

	// Récupérer une équipe par ID
	const getTeamById = useCallback(
		async (teamId: string): Promise<Team | null> => {
			try {
				setError(null);
				const { data, error } = await supabase
					.from("teams")
					.select(`
          id,
          name,
          description,
          color,
          avatar_url,
          is_active,
          created_by,
          created_at,
          updated_at,
          deleted_at
        `)
					.eq("id", teamId)
					.is("deleted_at", null)
					.single();

				if (error) throw error;

				return data;
			} catch (err) {
				console.error("Erreur lors de la récupération de l'équipe:", err);
				return null;
			}
		},
		[supabase],
	);

	// Charger les équipes au montage du composant
	useEffect(() => {
		fetchTeams();
	}, [fetchTeams]);

	// Uploader un avatar pour une équipe
	const uploadTeamAvatar = async (teamId: string, file: File) => {
		try {
			setError(null);

			// Valider le fichier
			const validation = validateImageFile(file);
			if (!validation.valid) {
				return { error: validation.error || "Fichier non valide" };
			}

			// Compresser l'image en WebP
			const compressedFile = await compressImage(file, {
				maxWidth: 400,
				maxHeight: 400,
				quality: 0.85,
				format: "webp",
			});

			// Supprimer l'ancien avatar s'il existe
			const currentTeam = teams.find((t) => t.id === teamId);
			if (currentTeam?.avatar_url) {
				const urlParts = currentTeam.avatar_url.split("/team-avatars/");
				if (urlParts.length > 1) {
					const filePath = urlParts[1];
					await supabase.storage.from("team-avatars").remove([filePath]);
				}
			}

			// Générer un nom de fichier unique
			const fileName = `team-avatar-${teamId}-${Date.now()}.webp`;

			// Upload du fichier compressé vers Supabase Storage (bucket team-avatars)
			const { error: uploadError } = await supabase.storage
				.from("team-avatars")
				.upload(fileName, compressedFile, {
					cacheControl: "3600",
					upsert: true,
				});

			if (uploadError) throw uploadError;

			// Récupérer l'URL publique
			const { data } = supabase.storage
				.from("team-avatars")
				.getPublicUrl(fileName);

			// Mettre à jour l'équipe avec la nouvelle URL d'avatar
			const { error: updateError } = await supabase
				.from("teams")
				.update({ avatar_url: data.publicUrl })
				.eq("id", teamId);

			if (updateError) throw updateError;

			// Refetch pour mettre à jour les données
			await fetchTeams();

			return { success: true, avatar_url: data.publicUrl };
		} catch (error) {
			console.error("Error uploading team avatar:", error);
			return {
				error:
					error instanceof Error ? error.message : "Erreur lors de l'upload",
			};
		}
	};

	// Supprimer un avatar d'équipe
	const removeTeamAvatar = async (teamId: string) => {
		try {
			setError(null);

			// Supprimer le fichier du storage s'il existe
			const currentTeam = teams.find((t) => t.id === teamId);
			if (currentTeam?.avatar_url) {
				const urlParts = currentTeam.avatar_url.split("/team-avatars/");
				if (urlParts.length > 1) {
					const filePath = urlParts[1];
					await supabase.storage.from("team-avatars").remove([filePath]);
				}
			}

			// Mettre à jour l'équipe pour supprimer l'avatar
			const { error: updateError } = await supabase
				.from("teams")
				.update({ avatar_url: null })
				.eq("id", teamId);

			if (updateError) throw updateError;

			// Refetch pour mettre à jour les données
			await fetchTeams();

			return { success: true };
		} catch (error) {
			console.error("Error removing team avatar:", error);
			return {
				error:
					error instanceof Error
						? error.message
						: "Erreur lors de la suppression",
			};
		}
	};

	return {
		teams,
		loading,
		error,
		createTeam,
		updateTeam,
		deleteTeam,
		toggleTeamStatus,
		getTeamById,
		uploadTeamAvatar,
		removeTeamAvatar,
		refetch: fetchTeams,
		setError,
	};
}
