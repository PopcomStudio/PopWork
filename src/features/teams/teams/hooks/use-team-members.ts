"use client";

import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@/lib/supabase";
import type {
	TeamMemberWithUser,
	AddTeamMemberData,
	UpdateTeamMemberData,
} from "../types";

// Types pour les données Supabase
interface SupabaseUser {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	avatar_url: string | null;
	roles: { name: string } | { name: string }[];
}

interface SupabaseTeamMember {
	id: string;
	team_id: string;
	user_id: string;
	role: "member" | "lead" | "admin";
	joined_at: string;
	created_by: string | null;
	is_active: boolean;
	notification_preferences: {
		email: boolean;
		in_app: boolean;
	} | null;
	users: SupabaseUser | SupabaseUser[];
}

export function useTeamMembers(teamId?: string, onTeamDataChange?: () => void) {
	const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
	const [availableUsers, setAvailableUsers] = useState<
		Array<{
			id: string;
			firstName: string;
			lastName: string;
			email: string;
			avatar_url: string | null;
			roleName: string;
		}>
	>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const supabase = createClientComponentClient();

	// Récupérer les membres d'une équipe
	const fetchTeamMembers = useCallback(
		async (targetTeamId?: string) => {
			if (!targetTeamId && !teamId) return;

			const id = targetTeamId || teamId;
			try {
				setLoading(true);
				setError(null);
				const { data, error } = await supabase
					.from("team_members")
					.select(`
          id,
          team_id,
          user_id,
          role,
          joined_at,
          created_by,
          is_active,
          notification_preferences,
          users!team_members_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            roles!inner(name)
          )
        `)
					.eq("team_id", id)
					.eq("is_active", true)
					.order("joined_at", { ascending: false });

				if (error) throw error;

				const mappedMembers = data.map((member: SupabaseTeamMember) => {
					const user = Array.isArray(member.users)
						? member.users[0]
						: member.users;
					const role = user
						? Array.isArray(user.roles)
							? user.roles[0]
							: user.roles
						: null;

					return {
						id: member.id,
						team_id: member.team_id,
						user_id: member.user_id,
						role: member.role,
						joined_at: member.joined_at,
						created_by: member.created_by,
						is_active: member.is_active,
						notification_preferences: member.notification_preferences || {
							email: true,
							in_app: true,
						},
						user: {
							id: user.id,
							firstName: user.first_name,
							lastName: user.last_name,
							email: user.email,
							avatar_url: user.avatar_url,
							roleName: role?.name || "Utilisateur",
						},
					};
				});

				setMembers(mappedMembers);
			} catch (err) {
				console.error("Erreur lors du chargement des membres:", err);
				setError(err instanceof Error ? err.message : "Erreur inconnue");
			} finally {
				setLoading(false);
			}
		},
		[supabase, teamId],
	);

	// Récupérer les utilisateurs disponibles (non membres de l'équipe)
	const fetchAvailableUsers = useCallback(
		async (targetTeamId?: string) => {
			if (!targetTeamId && !teamId) return;

			const id = targetTeamId || teamId;
			try {
				setError(null);

				// Récupérer tous les utilisateurs
				const { data: allUsers, error: usersError } = await supabase
					.from("users")
					.select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          roles!inner(name)
        `)
					.order("first_name", { ascending: true });

				if (usersError) throw usersError;

				// Récupérer les membres actuels de l'équipe
				const { data: currentMembers, error: membersError } = await supabase
					.from("team_members")
					.select("user_id")
					.eq("team_id", id)
					.eq("is_active", true);

				if (membersError) throw membersError;

				const currentMemberIds = currentMembers.map((m) => m.user_id);

				// Filtrer les utilisateurs qui ne sont pas dans l'équipe
				const availableUsers = allUsers
					.filter((user) => !currentMemberIds.includes(user.id))
					.map((user) => {
						const role = Array.isArray(user.roles) ? user.roles[0] : user.roles;
						return {
							id: user.id,
							firstName: user.first_name,
							lastName: user.last_name,
							email: user.email,
							avatar_url: user.avatar_url,
							roleName: role?.name || "Utilisateur",
						};
					});

				setAvailableUsers(availableUsers);
			} catch (err) {
				console.error(
					"Erreur lors du chargement des utilisateurs disponibles:",
					err,
				);
				setError(err instanceof Error ? err.message : "Erreur inconnue");
			}
		},
		[supabase, teamId],
	);

	// Ajouter un membre à l'équipe
	const addTeamMember = async (memberData: AddTeamMemberData) => {
		try {
			setError(null);

			// Vérifier d'abord si l'utilisateur n'est pas déjà membre
			const { data: existingMember, error: checkError } = await supabase
				.from("team_members")
				.select("id, is_active")
				.eq("team_id", memberData.team_id)
				.eq("user_id", memberData.user_id)
				.single();

			if (checkError && checkError.code !== "PGRST116") {
				// PGRST116 = no rows returned
				throw checkError;
			}

			// Si l'utilisateur existe déjà et est actif, ne rien faire
			if (existingMember?.is_active) {
				console.log("L'utilisateur est déjà membre de cette équipe");
				return null;
			}

			// Si l'utilisateur était membre mais inactif, le réactiver
			if (existingMember && !existingMember.is_active) {
				const { data, error } = await supabase
					.from("team_members")
					.update({
						role: memberData.role,
						is_active: true,
						joined_at: new Date().toISOString(),
					})
					.eq("id", existingMember.id)
					.select(`
            id,
            team_id,
            user_id,
            role,
            joined_at,
            created_by,
            is_active,
            notification_preferences,
            users!team_members_user_id_fkey(
              id,
              first_name,
              last_name,
              email,
              avatar_url,
              roles!inner(name)
            )
          `)
					.single();

				if (error) throw error;

				const user = Array.isArray(data.users) ? data.users[0] : data.users;
				const role = user
					? Array.isArray(user.roles)
						? user.roles[0]
						: user.roles
					: null;

				const reactivatedMember: TeamMemberWithUser = {
					id: data.id,
					team_id: data.team_id,
					user_id: data.user_id,
					role: data.role,
					joined_at: data.joined_at,
					created_by: data.created_by,
					is_active: data.is_active,
					notification_preferences: data.notification_preferences || {
						email: true,
						in_app: true,
					},
					user: {
						id: user.id,
						firstName: user.first_name,
						lastName: user.last_name,
						email: user.email,
						avatar_url: user.avatar_url,
						roleName: role?.name || "Utilisateur",
					},
				};

				// Refetch les données pour mettre à jour les compteurs globaux
				await fetchTeamMembers(memberData.team_id);
				await fetchAvailableUsers(memberData.team_id);
				// Notifier le composant parent pour rafraîchir les statistiques des équipes
				if (onTeamDataChange) {
					onTeamDataChange();
				}
				return reactivatedMember;
			}

			// Sinon, créer un nouveau membre
			const { data, error } = await supabase
				.from("team_members")
				.insert([
					{
						team_id: memberData.team_id,
						user_id: memberData.user_id,
						role: memberData.role,
						joined_at: new Date().toISOString(),
						is_active: true,
						notification_preferences: memberData.notification_preferences || {
							email: true,
							in_app: true,
						},
					},
				])
				.select(`
          id,
          team_id,
          user_id,
          role,
          joined_at,
          created_by,
          is_active,
          notification_preferences,
          users!team_members_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            roles!inner(name)
          )
        `)
				.single();

			if (error) throw error;

			const user = Array.isArray(data.users) ? data.users[0] : data.users;
			const role = user
				? Array.isArray(user.roles)
					? user.roles[0]
					: user.roles
				: null;

			const newMember: TeamMemberWithUser = {
				id: data.id,
				team_id: data.team_id,
				user_id: data.user_id,
				role: data.role,
				joined_at: data.joined_at,
				created_by: data.created_by,
				is_active: data.is_active,
				notification_preferences: data.notification_preferences || {
					email: true,
					in_app: true,
				},
				user: {
					id: user.id,
					firstName: user.first_name,
					lastName: user.last_name,
					email: user.email,
					avatar_url: user.avatar_url,
					roleName: role?.name || "Utilisateur",
				},
			};

			setMembers((prev) => [newMember, ...prev]);

			// Mettre à jour la liste des utilisateurs disponibles
			setAvailableUsers((prev) =>
				prev.filter((u) => u.id !== memberData.user_id),
			);

			// Notifier le composant parent pour rafraîchir les statistiques des équipes
			if (onTeamDataChange) {
				onTeamDataChange();
			}

			return newMember;
		} catch (err) {
			console.error("Erreur lors de l'ajout du membre:", err);
			throw err;
		}
	};

	// Mettre à jour un membre d'équipe
	const updateTeamMember = async (memberData: UpdateTeamMemberData) => {
		try {
			setError(null);
			const { data, error } = await supabase
				.from("team_members")
				.update({
					role: memberData.role,
					notification_preferences: memberData.notification_preferences,
				})
				.eq("id", memberData.id)
				.select(`
          id,
          team_id,
          user_id,
          role,
          joined_at,
          created_by,
          is_active,
          notification_preferences,
          users!team_members_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            roles!inner(name)
          )
        `)
				.single();

			if (error) throw error;

			const user = Array.isArray(data.users) ? data.users[0] : data.users;
			const role = user
				? Array.isArray(user.roles)
					? user.roles[0]
					: user.roles
				: null;

			const updatedMember: TeamMemberWithUser = {
				id: data.id,
				team_id: data.team_id,
				user_id: data.user_id,
				role: data.role,
				joined_at: data.joined_at,
				created_by: data.created_by,
				is_active: data.is_active,
				notification_preferences: data.notification_preferences || {
					email: true,
					in_app: true,
				},
				user: {
					id: user.id,
					firstName: user.first_name,
					lastName: user.last_name,
					email: user.email,
					avatar_url: user.avatar_url,
					roleName: role?.name || "Utilisateur",
				},
			};

			setMembers((prev) =>
				prev.map((member) =>
					member.id === memberData.id ? updatedMember : member,
				),
			);

			// Notifier le composant parent pour rafraîchir les statistiques des équipes
			if (onTeamDataChange) {
				onTeamDataChange();
			}

			return updatedMember;
		} catch (err) {
			console.error("Erreur lors de la mise à jour du membre:", err);
			throw err;
		}
	};

	// Retirer un membre de l'équipe
	const removeTeamMember = async (memberId: string) => {
		try {
			setError(null);

			// Récupérer les infos du membre avant suppression pour maj des users disponibles
			const memberToRemove = members.find((m) => m.id === memberId);

			const { error } = await supabase
				.from("team_members")
				.update({ is_active: false })
				.eq("id", memberId);

			if (error) throw error;

			setMembers((prev) => prev.filter((member) => member.id !== memberId));

			// Ajouter l'utilisateur à la liste des disponibles
			if (memberToRemove?.user) {
				setAvailableUsers((prev) =>
					[...prev, memberToRemove.user].sort((a, b) =>
						a.firstName.localeCompare(b.firstName),
					),
				);
			}

			// Notifier le composant parent pour rafraîchir les statistiques des équipes
			if (onTeamDataChange) {
				onTeamDataChange();
			}
		} catch (err) {
			console.error("Erreur lors du retrait du membre:", err);
			throw err;
		}
	};

	// Changer le rôle d'un membre
	const changeTeamMemberRole = async (
		memberId: string,
		newRole: "member" | "lead" | "admin",
	) => {
		try {
			setError(null);
			await updateTeamMember({ id: memberId, role: newRole });
		} catch (err) {
			console.error("Erreur lors du changement de rôle:", err);
			throw err;
		}
	};

	// Charger les membres quand teamId change
	useEffect(() => {
		if (teamId) {
			fetchTeamMembers();
			fetchAvailableUsers();
		}
	}, [teamId, fetchTeamMembers, fetchAvailableUsers]);

	return {
		members,
		availableUsers,
		loading,
		error,
		addTeamMember,
		updateTeamMember,
		removeTeamMember,
		changeTeamMemberRole,
		fetchTeamMembers,
		fetchAvailableUsers,
		setError,
	};
}
