"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  company_id: string
  service_id: string
  company_name: string
  service_name: string
  task_count: number
  completed_tasks: number
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  name: string
  description?: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  company_id: string
  service_id: string
}

export interface UpdateProjectData extends CreateProjectData {
  id: string
}

// Types pour les données Supabase
interface SupabaseCompany {
  name: string
}

interface SupabaseService {
  name: string
}

interface SupabaseTask {
  id: string
  status: string
}

interface SupabaseProject {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  company_id: string
  service_id: string
  created_at: string
  updated_at: string
  companies: SupabaseCompany | SupabaseCompany[]
  services: SupabaseService | SupabaseService[]
  tasks: SupabaseTask[]
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Récupérer tous les projets avec leurs relations et statistiques
  const fetchProjects = useCallback(async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          company_id,
          service_id,
          created_at,
          updated_at,
          companies!inner(name),
          services!inner(name),
          tasks(id, status)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedProjects = data.map((project: SupabaseProject) => {
        // Gérer les relations companies et services (peuvent être objet ou tableau)
        const company = Array.isArray(project.companies) ? project.companies[0] : project.companies
        const service = Array.isArray(project.services) ? project.services[0] : project.services
        
        // Calculer les statistiques des tâches
        const tasks = project.tasks || []
        const completedTasks = tasks.filter((task: SupabaseTask) => task.status === 'done').length
        
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          company_id: project.company_id,
          service_id: project.service_id,
          company_name: company?.name || '',
          service_name: service?.name || '',
          task_count: tasks.length,
          completed_tasks: completedTasks,
          created_at: project.created_at,
          updated_at: project.updated_at,
        }
      })

      setProjects(mappedProjects)
    } catch (err) {
      console.error('Erreur lors du chargement des projets:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Créer un nouveau projet
  const createProject = async (projectData: CreateProjectData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: projectData.name,
          description: projectData.description || null,
          status: projectData.status,
          company_id: projectData.company_id,
          service_id: projectData.service_id,
        }])
        .select(`
          id,
          name,
          description,
          status,
          company_id,
          service_id,
          created_at,
          updated_at,
          companies!inner(name),
          services!inner(name)
        `)
        .single()

      if (error) throw error

      // Gérer les relations companies et services (peuvent être objet ou tableau)
      const company = Array.isArray(data.companies) ? data.companies[0] : data.companies
      const service = Array.isArray(data.services) ? data.services[0] : data.services

      const newProject: Project = {
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        company_id: data.company_id,
        service_id: data.service_id,
        company_name: company?.name || '',
        service_name: service?.name || '',
        task_count: 0,
        completed_tasks: 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setProjects(prev => [newProject, ...prev])
      return newProject
    } catch (err) {
      console.error('Erreur lors de la création du projet:', err)
      throw err
    }
  }

  // Mettre à jour un projet
  const updateProject = async (projectData: UpdateProjectData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: projectData.name,
          description: projectData.description || null,
          status: projectData.status,
          company_id: projectData.company_id,
          service_id: projectData.service_id,
        })
        .eq('id', projectData.id)
        .select(`
          id,
          name,
          description,
          status,
          company_id,
          service_id,
          created_at,
          updated_at,
          companies!inner(name),
          services!inner(name),
          tasks(id, status)
        `)
        .single()

      if (error) throw error

      // Gérer les relations companies et services (peuvent être objet ou tableau)
      const company = Array.isArray(data.companies) ? data.companies[0] : data.companies
      const service = Array.isArray(data.services) ? data.services[0] : data.services

      // Calculer les statistiques des tâches
      const tasks = data.tasks || []
      const completedTasks = tasks.filter((task: any) => task.status === 'done').length

      const updatedProject: Project = {
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        company_id: data.company_id,
        service_id: data.service_id,
        company_name: company?.name || '',
        service_name: service?.name || '',
        task_count: tasks.length,
        completed_tasks: completedTasks,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setProjects(prev => 
        prev.map(project => 
          project.id === projectData.id ? updatedProject : project
        )
      )
      return updatedProject
    } catch (err) {
      console.error('Erreur lors de la mise à jour du projet:', err)
      throw err
    }
  }

  // Supprimer un projet
  const deleteProject = async (projectId: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.filter(project => project.id !== projectId))
    } catch (err) {
      console.error('Erreur lors de la suppression du projet:', err)
      throw err
    }
  }

  // Récupérer les assignations d'un projet
  const fetchProjectAssignees = async (projectId: string) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('project_assignees')
        .select(`
          id,
          user_id,
          assigned_at,
          users!inner(
            id,
            first_name,
            last_name,
            email,
            role_id,
            roles!inner(name)
          )
        `)
        .eq('project_id', projectId)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      return data.map((assignment: any) => {
        const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users
        const role = user ? (Array.isArray(user.roles) ? user.roles[0] : user.roles) : null
        
        return {
          id: assignment.id,
          userId: assignment.user_id,
          assignedAt: assignment.assigned_at,
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            roleName: role?.name || 'Utilisateur',
          }
        }
      })
    } catch (err) {
      console.error('Erreur lors de la récupération des assignations:', err)
      throw err
    }
  }

  // Sauvegarder les assignations d'un projet
  const saveProjectAssignees = async (projectId: string, userIds: string[]) => {
    try {
      setError(null)
      
      // D'abord, supprimer les anciennes assignations
      const { error: deleteError } = await supabase
        .from('project_assignees')
        .delete()
        .eq('project_id', projectId)

      if (deleteError) throw deleteError

      // Ensuite, ajouter les nouvelles assignations
      if (userIds.length > 0) {
        const assignmentsData = userIds.map(userId => ({
          project_id: projectId,
          user_id: userId,
          assigned_at: new Date().toISOString(),
        }))

        const { error: insertError } = await supabase
          .from('project_assignees')
          .insert(assignmentsData)

        if (insertError) throw insertError
      }

      return userIds
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des assignations:', err)
      throw err
    }
  }

  // Charger les projets au montage du composant
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    fetchProjectAssignees,
    saveProjectAssignees,
    refetch: fetchProjects,
    setError,
  }
} 