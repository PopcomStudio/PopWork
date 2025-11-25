"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type {
  ProjectMemberWithUser,
  ProjectMemberRole,
  AvailableUser,
  AddProjectMemberData,
} from '../types/project-members'
import { DEFAULT_PROJECT_ROLE } from '../constants/project-member-roles'

// Types pour les donnees Supabase
interface SupabaseUser {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  roles: { name: string } | { name: string }[]
}

interface SupabaseProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectMemberRole
  assigned_at: string
  users: SupabaseUser | SupabaseUser[]
}

export function useProjectMembers(projectId?: string, onDataChange?: () => void) {
  const [members, setMembers] = useState<ProjectMemberWithUser[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Recuperer les membres d'un projet
  const fetchProjectMembers = useCallback(async (targetProjectId?: string) => {
    if (!targetProjectId && !projectId) return

    const id = targetProjectId || projectId
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('project_assignees')
        .select(`
          id,
          project_id,
          user_id,
          role,
          assigned_at,
          users!project_assignees_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            roles!inner(name)
          )
        `)
        .eq('project_id', id)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      const mappedMembers = data.map((member: SupabaseProjectMember) => {
        const user = Array.isArray(member.users) ? member.users[0] : member.users
        const role = user ? (Array.isArray(user.roles) ? user.roles[0] : user.roles) : null

        return {
          id: member.id,
          projectId: member.project_id,
          userId: member.user_id,
          role: member.role,
          assignedAt: member.assigned_at,
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            avatarUrl: user.avatar_url || undefined,
            globalRole: role?.name || 'Utilisateur',
          }
        }
      })

      setMembers(mappedMembers)
    } catch (err) {
      console.error('Erreur lors du chargement des membres:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId])

  // Recuperer les utilisateurs disponibles (non membres du projet)
  const fetchAvailableUsers = useCallback(async (targetProjectId?: string) => {
    if (!targetProjectId && !projectId) return

    const id = targetProjectId || projectId
    try {
      setError(null)

      // Recuperer tous les utilisateurs
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          roles!inner(name)
        `)
        .order('first_name', { ascending: true })

      if (usersError) throw usersError

      // Recuperer les membres actuels du projet
      const { data: currentMembers, error: membersError } = await supabase
        .from('project_assignees')
        .select('user_id')
        .eq('project_id', id)

      if (membersError) throw membersError

      const currentMemberIds = currentMembers.map(m => m.user_id)

      // Filtrer les utilisateurs qui ne sont pas dans le projet
      const available = allUsers
        .filter(user => !currentMemberIds.includes(user.id))
        .map(user => {
          const role = Array.isArray(user.roles) ? user.roles[0] : user.roles
          return {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            avatarUrl: user.avatar_url || undefined,
            globalRole: role?.name || 'Utilisateur',
          }
        })

      setAvailableUsers(available)
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs disponibles:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }, [supabase, projectId])

  // Ajouter un membre au projet
  const addProjectMember = async (memberData: AddProjectMemberData) => {
    try {
      setError(null)

      // Verifier si l'utilisateur n'est pas deja membre
      const { data: existing, error: checkError } = await supabase
        .from('project_assignees')
        .select('id')
        .eq('project_id', memberData.projectId)
        .eq('user_id', memberData.userId)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existing) {
        console.log('L\'utilisateur est deja membre de ce projet')
        return null
      }

      // Creer le nouveau membre
      const { data, error } = await supabase
        .from('project_assignees')
        .insert([{
          project_id: memberData.projectId,
          user_id: memberData.userId,
          role: memberData.role || DEFAULT_PROJECT_ROLE,
          assigned_at: new Date().toISOString(),
        }])
        .select(`
          id,
          project_id,
          user_id,
          role,
          assigned_at,
          users!project_assignees_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            roles!inner(name)
          )
        `)
        .single()

      if (error) throw error

      const user = Array.isArray(data.users) ? data.users[0] : data.users
      const role = user ? (Array.isArray(user.roles) ? user.roles[0] : user.roles) : null

      const newMember: ProjectMemberWithUser = {
        id: data.id,
        projectId: data.project_id,
        userId: data.user_id,
        role: data.role,
        assignedAt: data.assigned_at,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          avatarUrl: user.avatar_url || undefined,
          globalRole: role?.name || 'Utilisateur',
        }
      }

      setMembers(prev => [newMember, ...prev])
      setAvailableUsers(prev => prev.filter(u => u.id !== memberData.userId))

      if (onDataChange) {
        onDataChange()
      }

      return newMember
    } catch (err) {
      console.error('Erreur lors de l\'ajout du membre:', err)
      throw err
    }
  }

  // Mettre a jour le role d'un membre
  const updateProjectMemberRole = async (memberId: string, newRole: ProjectMemberRole) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('project_assignees')
        .update({ role: newRole })
        .eq('id', memberId)
        .select(`
          id,
          project_id,
          user_id,
          role,
          assigned_at,
          users!project_assignees_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            roles!inner(name)
          )
        `)
        .single()

      if (error) throw error

      const user = Array.isArray(data.users) ? data.users[0] : data.users
      const role = user ? (Array.isArray(user.roles) ? user.roles[0] : user.roles) : null

      const updatedMember: ProjectMemberWithUser = {
        id: data.id,
        projectId: data.project_id,
        userId: data.user_id,
        role: data.role,
        assignedAt: data.assigned_at,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          avatarUrl: user.avatar_url || undefined,
          globalRole: role?.name || 'Utilisateur',
        }
      }

      setMembers(prev =>
        prev.map(member =>
          member.id === memberId ? updatedMember : member
        )
      )

      if (onDataChange) {
        onDataChange()
      }

      return updatedMember
    } catch (err) {
      console.error('Erreur lors de la mise a jour du role:', err)
      throw err
    }
  }

  // Retirer un membre du projet
  const removeProjectMember = async (memberId: string) => {
    try {
      setError(null)

      const memberToRemove = members.find(m => m.id === memberId)

      const { error } = await supabase
        .from('project_assignees')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => prev.filter(member => member.id !== memberId))

      // Ajouter l'utilisateur a la liste des disponibles
      if (memberToRemove?.user) {
        const userToAdd: AvailableUser = {
          id: memberToRemove.user.id,
          firstName: memberToRemove.user.firstName,
          lastName: memberToRemove.user.lastName,
          email: memberToRemove.user.email,
          avatarUrl: memberToRemove.user.avatarUrl,
          globalRole: memberToRemove.user.globalRole,
        }
        setAvailableUsers(prev =>
          [...prev, userToAdd].sort((a, b) => a.firstName.localeCompare(b.firstName))
        )
      }

      if (onDataChange) {
        onDataChange()
      }
    } catch (err) {
      console.error('Erreur lors du retrait du membre:', err)
      throw err
    }
  }

  // Charger les membres quand projectId change
  useEffect(() => {
    if (projectId) {
      fetchProjectMembers()
      fetchAvailableUsers()
    }
  }, [projectId, fetchProjectMembers, fetchAvailableUsers])

  return {
    members,
    availableUsers,
    loading,
    error,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
    fetchProjectMembers,
    fetchAvailableUsers,
    setError,
  }
}
