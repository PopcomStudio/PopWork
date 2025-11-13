"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  project_id: string
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignees: TaskAssignee[]
}

export interface TaskAssignee {
  id: string
  user_id: string
  assigned_at: string
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface CreateTaskData {
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  project_id: string
  start_date?: string
  due_date?: string
  assignee_ids?: string[]
}

export interface UpdateTaskData extends CreateTaskData {
  id: string
}

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Récupérer toutes les tâches d'un projet avec leurs assignations
  const fetchTasks = async () => {
    if (!projectId) return
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          project_id,
          start_date,
          due_date,
          created_at,
          updated_at,
          task_assignees(
            id,
            user_id,
            assigned_at,
            users!inner(
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedTasks: Task[] = data.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.project_id,
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
        assignees: task.task_assignees?.map((assignee: any) => {
          const user = Array.isArray(assignee.users) ? assignee.users[0] : assignee.users
          return {
            id: assignee.id,
            user_id: assignee.user_id,
            assigned_at: assignee.assigned_at,
            user: {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
            }
          }
        }) || []
      }))

      setTasks(mappedTasks)
    } catch (err) {
      console.error('Erreur lors du chargement des tâches:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Créer une nouvelle tâche
  const createTask = async (taskData: CreateTaskData): Promise<Task> => {
    try {
      setError(null)
      
      // Créer la tâche
      const { data: taskResult, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description || null,
          status: taskData.status,
          priority: taskData.priority,
          project_id: taskData.project_id,
          start_date: taskData.start_date || null,
          due_date: taskData.due_date || null,
        }])
        .select('id, title, description, status, priority, project_id, start_date, due_date, created_at, updated_at')
        .single()

      if (taskError) throw taskError

      // Assigner les utilisateurs si spécifiés
      let assignees: TaskAssignee[] = []
      if (taskData.assignee_ids && taskData.assignee_ids.length > 0) {
        const assignmentsData = taskData.assignee_ids.map(userId => ({
          task_id: taskResult.id,
          user_id: userId,
          assigned_at: new Date().toISOString(),
        }))

        const { data: assigneeResult, error: assigneeError } = await supabase
          .from('task_assignees')
          .insert(assignmentsData)
          .select(`
            id,
            user_id,
            assigned_at,
            users!inner(id, first_name, last_name, email)
          `)

        if (assigneeError) throw assigneeError

        assignees = assigneeResult.map((assignee: any) => {
          const user = Array.isArray(assignee.users) ? assignee.users[0] : assignee.users
          return {
            id: assignee.id,
            user_id: assignee.user_id,
            assigned_at: assignee.assigned_at,
            user: {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
            }
          }
        })
      }

      const newTask: Task = {
        ...taskResult,
        assignees
      }

      setTasks(prev => [newTask, ...prev])
      return newTask
    } catch (err) {
      console.error('Erreur lors de la création de la tâche:', err)
      throw err
    }
  }

  // Mettre à jour une tâche
  const updateTask = async (taskData: UpdateTaskData): Promise<Task> => {
    try {
      setError(null)

      // Mettre à jour la tâche
      const { data: taskResult, error: taskError } = await supabase
        .from('tasks')
        .update({
          title: taskData.title,
          description: taskData.description || null,
          status: taskData.status,
          priority: taskData.priority,
          start_date: taskData.start_date || null,
          due_date: taskData.due_date || null,
        })
        .eq('id', taskData.id)
        .select('id, title, description, status, priority, project_id, start_date, due_date, created_at, updated_at')
        .single()

      if (taskError) throw taskError

      // Mettre à jour les assignations
      let assignees: TaskAssignee[] = []
      if (taskData.assignee_ids !== undefined) {
        // Supprimer les anciennes assignations
        const { error: deleteError } = await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', taskData.id)

        if (deleteError) throw deleteError

        // Ajouter les nouvelles assignations
        if (taskData.assignee_ids.length > 0) {
          const assignmentsData = taskData.assignee_ids.map(userId => ({
            task_id: taskData.id,
            user_id: userId,
            assigned_at: new Date().toISOString(),
          }))

          const { data: assigneeResult, error: assigneeError } = await supabase
            .from('task_assignees')
            .insert(assignmentsData)
            .select(`
              id,
              user_id,
              assigned_at,
              users!inner(id, first_name, last_name, email)
            `)

          if (assigneeError) throw assigneeError

          assignees = assigneeResult.map((assignee: any) => {
            const user = Array.isArray(assignee.users) ? assignee.users[0] : assignee.users
            return {
              id: assignee.id,
              user_id: assignee.user_id,
              assigned_at: assignee.assigned_at,
              user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
              }
            }
          })
        }
      } else {
        // Garder les assignations existantes
        const existingTask = tasks.find(t => t.id === taskData.id)
        assignees = existingTask?.assignees || []
      }

      const updatedTask: Task = {
        ...taskResult,
        assignees
      }

      setTasks(prev => 
        prev.map(task => 
          task.id === taskData.id ? updatedTask : task
        )
      )
      return updatedTask
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la tâche:', err)
      throw err
    }
  }

  // Changer le statut d'une tâche (pour le drag & drop Kanban)
  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done'): Promise<void> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      // Mettre à jour localement
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err)
      throw err
    }
  }

  // Supprimer une tâche
  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      setError(null)
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (err) {
      console.error('Erreur lors de la suppression de la tâche:', err)
      throw err
    }
  }

  // Charger les tâches au montage du composant
  useEffect(() => {
    if (projectId) {
      fetchTasks()
    }
  }, [projectId])

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    refetch: fetchTasks,
    setError,
  }
} 