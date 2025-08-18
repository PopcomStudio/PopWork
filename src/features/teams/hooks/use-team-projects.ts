"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { 
  TeamProjectWithDetails,
  AssignTeamToProjectData 
} from '../types'

// Types pour les données Supabase
interface SupabaseProject {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  companies: { name: string } | { name: string }[]
  services: { name: string } | { name: string }[]
}

interface SupabaseTeamProjectAssignment {
  id: string
  team_id: string
  project_id: string
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
  permissions: {
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
  } | null
  projects: SupabaseProject | SupabaseProject[]
}

export function useTeamProjects(teamId?: string, onTeamDataChange?: () => void) {
  const [teamProjects, setTeamProjects] = useState<TeamProjectWithDetails[]>([])
  const [availableProjects, setAvailableProjects] = useState<Array<{
    id: string
    name: string
    description: string | null
    status: string
    company_name: string
    service_name: string
  }>>([]) 
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Récupérer les projets assignés à une équipe
  const fetchTeamProjects = useCallback(async (targetTeamId?: string) => {
    if (!targetTeamId && !teamId) return

    const id = targetTeamId || teamId
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('team_project_assignments')
        .select(`
          id,
          team_id,
          project_id,
          assigned_at,
          assigned_by,
          is_active,
          permissions,
          projects!inner(
            id,
            name,
            description,
            status,
            companies!inner(name),
            services!inner(name)
          )
        `)
        .eq('team_id', id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      const mappedProjects = data.map((assignment: SupabaseTeamProjectAssignment) => {
        const project = Array.isArray(assignment.projects) ? assignment.projects[0] : assignment.projects
        const company = project ? (Array.isArray(project.companies) ? project.companies[0] : project.companies) : null
        const service = project ? (Array.isArray(project.services) ? project.services[0] : project.services) : null

        return {
          id: assignment.id,
          team_id: assignment.team_id,
          project_id: assignment.project_id,
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by,
          is_active: assignment.is_active,
          permissions: assignment.permissions || {
            can_view: true,
            can_edit: false,
            can_delete: false
          },
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            company_name: company?.name || 'Aucune entreprise',
            service_name: service?.name || 'Aucun service',
          }
        }
      })

      setTeamProjects(mappedProjects)
    } catch (err) {
      console.error('Erreur lors du chargement des projets de l\'équipe:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [supabase, teamId])

  // Récupérer les projets disponibles (non assignés à l'équipe)
  const fetchAvailableProjects = useCallback(async (targetTeamId?: string) => {
    if (!targetTeamId && !teamId) return

    const id = targetTeamId || teamId
    try {
      setError(null)
      
      // Récupérer tous les projets
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          companies!inner(name),
          services!inner(name)
        `)
        .order('name', { ascending: true })

      if (projectsError) throw projectsError

      // Récupérer les projets actuellement assignés à l'équipe
      const { data: currentAssignments, error: assignmentsError } = await supabase
        .from('team_project_assignments')
        .select('project_id')
        .eq('team_id', id)
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      const assignedProjectIds = currentAssignments.map(a => a.project_id)
      
      // Filtrer les projets qui ne sont pas assignés à l'équipe
      const availableProjects = allProjects
        .filter(project => !assignedProjectIds.includes(project.id))
        .map(project => {
          const company = Array.isArray(project.companies) ? project.companies[0] : project.companies
          const service = Array.isArray(project.services) ? project.services[0] : project.services
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            company_name: company?.name || 'Aucune entreprise',
            service_name: service?.name || 'Aucun service',
          }
        })

      setAvailableProjects(availableProjects)
    } catch (err) {
      console.error('Erreur lors du chargement des projets disponibles:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }, [supabase, teamId])

  // Assigner un projet à l'équipe
  const assignTeamToProject = async (assignmentData: AssignTeamToProjectData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('team_project_assignments')
        .insert([{
          team_id: assignmentData.team_id,
          project_id: assignmentData.project_id,
          assigned_at: new Date().toISOString(),
          is_active: true,
          permissions: assignmentData.permissions || {
            can_view: true,
            can_edit: false,
            can_delete: false
          }
        }])
        .select(`
          id,
          team_id,
          project_id,
          assigned_at,
          assigned_by,
          is_active,
          permissions,
          projects!inner(
            id,
            name,
            description,
            status,
            companies!inner(name),
            services!inner(name)
          )
        `)
        .single()

      if (error) throw error

      const project = Array.isArray(data.projects) ? data.projects[0] : data.projects
      const company = project ? (Array.isArray(project.companies) ? project.companies[0] : project.companies) : null
      const service = project ? (Array.isArray(project.services) ? project.services[0] : project.services) : null

      const newAssignment: TeamProjectWithDetails = {
        id: data.id,
        team_id: data.team_id,
        project_id: data.project_id,
        assigned_at: data.assigned_at,
        assigned_by: data.assigned_by,
        is_active: data.is_active,
        permissions: data.permissions || {
          can_view: true,
          can_edit: false,
          can_delete: false
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          company_name: company?.name || 'Aucune entreprise',
          service_name: service?.name || 'Aucun service',
        }
      }

      setTeamProjects(prev => [newAssignment, ...prev])
      
      // Mettre à jour la liste des projets disponibles
      setAvailableProjects(prev => prev.filter(p => p.id !== assignmentData.project_id))
      
      // Notifier le composant parent pour rafraîchir les statistiques des équipes
      if (onTeamDataChange) {
        onTeamDataChange()
      }
      
      return newAssignment
    } catch (err) {
      console.error('Erreur lors de l\'assignation du projet:', err)
      throw err
    }
  }

  // Retirer un projet de l'équipe
  const removeTeamFromProject = async (assignmentId: string) => {
    try {
      setError(null)
      
      // Récupérer les infos du projet avant suppression pour maj des projets disponibles
      const assignmentToRemove = teamProjects.find(a => a.id === assignmentId)
      
      const { error } = await supabase
        .from('team_project_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId)

      if (error) throw error

      setTeamProjects(prev => prev.filter(assignment => assignment.id !== assignmentId))
      
      // Ajouter le projet à la liste des disponibles
      if (assignmentToRemove?.project) {
        setAvailableProjects(prev => [...prev, assignmentToRemove.project].sort((a, b) => 
          a.name.localeCompare(b.name)
        ))
      }
      
      // Notifier le composant parent pour rafraîchir les statistiques des équipes
      if (onTeamDataChange) {
        onTeamDataChange()
      }
    } catch (err) {
      console.error('Erreur lors du retrait du projet:', err)
      throw err
    }
  }

  // Charger les projets quand teamId change
  useEffect(() => {
    if (teamId) {
      fetchTeamProjects()
      fetchAvailableProjects()
    }
  }, [teamId, fetchTeamProjects, fetchAvailableProjects])

  return {
    teamProjects,
    availableProjects,
    loading,
    error,
    assignTeamToProject,
    removeTeamFromProject,
    fetchTeamProjects,
    fetchAvailableProjects,
    setError,
  }
}
