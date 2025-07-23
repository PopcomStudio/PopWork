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

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            user:users(id, firstName, lastName, email)
          ),
          checklist:task_checklist(
            id, title, completed, order, createdAt, updatedAt
          ),
          comments:task_comments(
            id, content, createdAt,
            user:users(firstName, lastName)
          ),
          attachments:task_attachments(
            id, fileName, fileUrl, fileSize, mimeType, uploadedAt,
            user:users(firstName, lastName)
          ),
          tags:task_tag_assignments(
            tag:task_tags(id, name, color)
          ),
          timers:task_timers(
            id, userId, startTime, endTime, duration,
            user:users(firstName, lastName)
          ),
          project:projects(id, name)
        `)
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false })

      if (fetchError) throw fetchError

      // Transformer les données en TaskExtended
      const extendedTasks: TaskExtended[] = data.map(task => {
        const checklist = task.checklist || []
        const timers = task.timers || []
        
        // Calculer le temps total loggué
        const timeLogged = timers.reduce((total: number, timer: any) => {
          return total + (timer.duration || 0)
        }, 0)

        // Calculer le progrès de la checklist
        const checklistProgress = checklist.length > 0 
          ? (checklist.filter((item: any) => item.completed).length / checklist.length) * 100 
          : 0

        // Vérifier si la tâche est en retard
        const isOverdue = task.dueDate 
          ? new Date(task.dueDate) < new Date() && task.status !== 'done'
          : false

        // Vérifier s'il y a un timer actif
        const activeTimer = timers.find((timer: any) => !timer.endTime)
        const hasActiveTimer = !!activeTimer
        const activeTimerUserId = activeTimer?.userId

        return {
          ...task,
          assignees: task.assignees?.map((a: any) => a.user) || [],
          checklist: checklist.sort((a: any, b: any) => a.order - b.order),
          comments: task.comments?.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ) || [],
          attachments: task.attachments || [],
          tags: task.tags?.map((t: any) => t.tag) || [],
          timers: timers,
          timeLogged,
          checklistProgress,
          isOverdue,
          hasActiveTimer,
          activeTimerUserId,
          project: task.project
        }
      })

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
          projectId: data.projectId,
          dueDate: data.dueDate
        }])
        .select()
        .single()

      if (createError) throw createError

      // Assigner les utilisateurs si spécifiés
      if (data.assigneeIds && data.assigneeIds.length > 0) {
        const assignments = data.assigneeIds.map(userId => ({
          taskId: newTask.id,
          userId,
          assignedAt: new Date().toISOString()
        }))

        await supabase.from('task_assignees').insert(assignments)
      }

      // Rafraîchir la liste
      await fetchTasks()
      
      return newTask as TaskExtended
    } catch (err) {
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
          dueDate: data.dueDate
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
          taskId,
          userId,
          assignedAt: new Date().toISOString()
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
        .eq('taskId', taskId)
        .eq('userId', userId)

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