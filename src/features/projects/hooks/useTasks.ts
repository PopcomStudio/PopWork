"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { 
  TaskExtended, 
  TaskFilters, 
  CreateTaskData, 
  UpdateTaskData,
  TaskStatus,
  KanbanStats
} from '../types/kanban'

interface UseTasksReturn {
  tasks: TaskExtended[]
  loading: boolean
  error: string | null
  stats: KanbanStats | null
  
  // Actions CRUD
  createTask: (data: CreateTaskData) => Promise<TaskExtended>
  updateTask: (data: UpdateTaskData) => Promise<TaskExtended>
  deleteTask: (taskId: string) => Promise<void>
  
  // Actions Kanban
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
  assignUser: (taskId: string, userId: string) => Promise<void>
  unassignUser: (taskId: string, userId: string) => Promise<void>
  
  // Filtres et recherche
  applyFilters: (filters: TaskFilters) => void
  clearFilters: () => void
  
  // Utilitaires
  refreshTasks: () => Promise<void>
  getTaskById: (taskId: string) => TaskExtended | undefined
  getTasksByStatus: (status: TaskStatus) => TaskExtended[]
}

export function useTasks(projectId: string): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskExtended[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<KanbanStats | null>(null)
  const [currentFilters, setCurrentFilters] = useState<TaskFilters>({})

  const supabase = createClientComponentClient()

  // Récupérer toutes les tâches d'un projet avec leurs relations
  const fetchTasks = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      // Récupérer les tâches depuis Supabase avec leurs tags
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name),
          task_assignees(
            user_id,
            users(id, first_name, last_name, email)
          ),
          task_tags(
            tag_id,
            tags(id, name, color, project_id)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      // Transformer les données en format TaskExtended
      const extendedTasks: TaskExtended[] = (tasksData || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status as TaskStatus,
        priority: task.priority,
        project_id: task.project_id,
        assignee_id: task.task_assignees?.[0]?.user_id || null,
        estimated_hours: 0, // À ajouter dans le schéma DB si nécessaire
        tracked_time: 0, // À calculer depuis task_timers si nécessaire
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
        tags: task.task_tags?.map(tt => tt.tags) || [],
        checklist: [], // À ajouter dans le schéma DB si nécessaire
        comments: [], // À ajouter dans le schéma DB si nécessaire
        attachments: [], // À ajouter dans le schéma DB si nécessaire
        assignees: task.task_assignees?.map(ta => ({
          id: ta.users.id,
          firstName: ta.users.first_name,
          lastName: ta.users.last_name,
          email: ta.users.email
        })) || [],
        assignee: task.task_assignees?.[0] ? {
          id: task.task_assignees[0].users.id,
          full_name: `${task.task_assignees[0].users.first_name} ${task.task_assignees[0].users.last_name}`
        } : null,
        project: task.project ? { id: task.project.id, name: task.project.name } : { id: projectId, name: 'Projet' }
      }))

      setTasks(extendedTasks)
      setFilteredTasks(extendedTasks)
      
      // Calculer les statistiques
      calculateStats(extendedTasks)

    } catch (err) {
      console.error('Erreur lors du chargement des tâches:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase])

  // Calculer les statistiques du projet
  const calculateStats = useCallback((taskList: TaskExtended[]) => {
    const totalTasks = taskList.length
    const completedTasks = taskList.filter(t => t.status === 'done').length
    const overdueTasks = taskList.filter(t => t.isOverdue).length
    const tasksInProgress = taskList.filter(t => t.status === 'in_progress').length

    const tasksByPriority = {
      high: taskList.filter(t => t.priority === 'high').length,
      medium: taskList.filter(t => t.priority === 'medium').length,
      low: taskList.filter(t => t.priority === 'low').length
    }

    // Grouper par assigné
    const assigneeMap = new Map()
    taskList.forEach(task => {
      task.assignees.forEach(assignee => {
        const key = assignee.id
        if (!assigneeMap.has(key)) {
          assigneeMap.set(key, {
            userId: assignee.id,
            userName: `${assignee.firstName} ${assignee.lastName}`,
            taskCount: 0
          })
        }
        assigneeMap.get(key).taskCount++
      })
    })

    const tasksByAssignee = Array.from(assigneeMap.values())

    // TODO: Calculer le temps moyen de completion
    const averageCompletionTime = 0

    const newStats: KanbanStats = {
      totalTasks,
      completedTasks,
      overdueTasks,
      tasksInProgress,
      averageCompletionTime,
      tasksByPriority,
      tasksByAssignee
    }

    setStats(newStats)
  }, [])

  // Créer une nouvelle tâche
  const createTask = useCallback(async (data: CreateTaskData): Promise<TaskExtended> => {
    try {
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert([{
          title: data.title,
          description: data.description || '',
          priority: data.priority,
          status: data.status || 'todo',
          project_id: data.projectId,
          due_date: data.dueDate
        }])
        .select()
        .single()

      if (createError) throw createError

      // Assigner les utilisateurs si spécifiés
      if (data.assigneeIds && data.assigneeIds.length > 0) {
        const assignments = data.assigneeIds.map(userId => ({
          task_id: newTask.id,
          user_id: userId,
          assigned_at: new Date().toISOString()
        }))

        await supabase.from('task_assignees').insert(assignments)
      }

      // Rafraîchir la liste
      await fetchTasks()
      
      return newTask as TaskExtended
    } catch (err) {
      console.error('Erreur détaillée création tâche:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur création tâche')
    }
  }, [supabase, fetchTasks])

  // Mettre à jour une tâche
  const updateTask = useCallback(async (data: UpdateTaskData): Promise<TaskExtended> => {
    try {
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          due_date: data.dueDate
        })
        .eq('id', data.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Rafraîchir la liste
      await fetchTasks()
      
      return updatedTask as TaskExtended
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur mise à jour tâche')
    }
  }, [supabase, fetchTasks])

  // Supprimer une tâche
  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) throw deleteError

      // Rafraîchir la liste
      await fetchTasks()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur suppression tâche')
    }
  }, [supabase, fetchTasks])

  // Déplacer une tâche (changer son statut)
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus): Promise<void> => {
    try {
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (moveError) throw moveError

      // Mise à jour optimiste
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
      setFilteredTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
    } catch (err) {
      // En cas d'erreur, rafraîchir depuis la DB
      await fetchTasks()
      throw new Error(err instanceof Error ? err.message : 'Erreur déplacement tâche')
    }
  }, [supabase, fetchTasks])

  // Assigner un utilisateur à une tâche
  const assignUser = useCallback(async (taskId: string, userId: string): Promise<void> => {
    try {
      const { error: assignError } = await supabase
        .from('task_assignees')
        .insert([{
          task_id: taskId,
          user_id: userId,
          assigned_at: new Date().toISOString()
        }])

      if (assignError) throw assignError

      await fetchTasks()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur assignation utilisateur')
    }
  }, [supabase, fetchTasks])

  // Désassigner un utilisateur d'une tâche
  const unassignUser = useCallback(async (taskId: string, userId: string): Promise<void> => {
    try {
      const { error: unassignError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId)

      if (unassignError) throw unassignError

      await fetchTasks()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur désassignation utilisateur')
    }
  }, [supabase, fetchTasks])

  // Appliquer des filtres
  const applyFilters = useCallback((filters: TaskFilters) => {
    setCurrentFilters(filters)
    
    let filtered = [...tasks]

    // Filtre par assigné
    if (filters.assigneeId) {
      filtered = filtered.filter(task => 
        task.assignees.some(assignee => assignee.id === filters.assigneeId)
      )
    }

    // Filtre par priorité
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority)
    }

    // Filtre par tags
    if (filters.tagIds && filters.tagIds.length > 0) {
      filtered = filtered.filter(task =>
        task.tags.some(tag => filters.tagIds!.includes(tag.id))
      )
    }

    // Filtre par recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      )
    }

    // Filtre par tâches en retard
    if (filters.hasOverdueTasks) {
      filtered = filtered.filter(task => task.isOverdue)
    }

    setFilteredTasks(filtered)
  }, [tasks])

  // Effacer les filtres
  const clearFilters = useCallback(() => {
    setCurrentFilters({})
    setFilteredTasks(tasks)
  }, [tasks])

  // Utilitaires
  const getTaskById = useCallback((taskId: string) => {
    return filteredTasks.find(task => task.id === taskId)
  }, [filteredTasks])

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return filteredTasks.filter(task => task.status === status)
  }, [filteredTasks])

  const refreshTasks = useCallback(async () => {
    await fetchTasks()
  }, [fetchTasks])

  // Charger les tâches au montage
  useEffect(() => {
    if (projectId) {
      fetchTasks()
    }
  }, [projectId, fetchTasks])

  // Réappliquer les filtres quand les tâches changent
  useEffect(() => {
    if (Object.keys(currentFilters).length > 0) {
      applyFilters(currentFilters)
    } else {
      setFilteredTasks(tasks)
    }
  }, [tasks, currentFilters, applyFilters])

  return {
    tasks: filteredTasks,
    loading,
    error,
    stats,
    
    // Actions CRUD
    createTask,
    updateTask,
    deleteTask,
    
    // Actions Kanban
    moveTask,
    assignUser,
    unassignUser,
    
    // Filtres
    applyFilters,
    clearFilters,
    
    // Utilitaires
    refreshTasks,
    getTaskById,
    getTasksByStatus
  }
}