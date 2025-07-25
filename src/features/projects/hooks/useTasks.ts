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
import { User, Tag } from '@/shared/types/database'

interface UseTasksReturn {
  tasks: TaskExtended[]
  loading: boolean
  error: string | null
  stats: KanbanStats | null
  isRealTimeConnected: boolean
  
  // Actions CRUD
  createTask: (data: CreateTaskData) => Promise<TaskExtended>
  updateTask: (data: UpdateTaskData) => Promise<TaskExtended>
  deleteTask: (taskId: string) => Promise<void>
  
  // Actions Kanban
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
  reorderTasks: (taskId: string, newIndex: number, status: TaskStatus) => Promise<void>
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
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)
  const [lastLocalUpdate, setLastLocalUpdate] = useState<{taskId: string, timestamp: number} | null>(null)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])

  const supabase = createClientComponentClient()

  // Fonction pour récupérer une seule tâche avec ses relations
  const fetchSingleTask = useCallback(async (taskId: string) => {
    try {
      const { data: taskData, error } = await supabase
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
        .eq('id', taskId)
        .single()

      if (error) throw error
      if (!taskData) return

      // Transformer en TaskExtended
      const isOverdue = taskData.due_date && taskData.status !== 'done' 
        ? new Date(taskData.due_date) < new Date() 
        : false
      
      const extendedTask: TaskExtended = {
        id: taskData.id,
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status as TaskStatus,
        priority: taskData.priority,
        project_id: taskData.project_id,
        due_date: taskData.due_date,
        created_at: taskData.created_at,
        updated_at: taskData.updated_at,
        tags: taskData.task_tags?.map(tt => tt.tags).filter(Boolean) || [],
        checklist: [],
        comments: [],
        attachments: [],
        timers: [],
        assignees: taskData.task_assignees?.map(ta => ({
          id: ta.users.id,
          firstName: ta.users.first_name,
          lastName: ta.users.last_name,
          email: ta.users.email
        })) || [],
        timeLogged: 0,
        checklistProgress: 0,
        isOverdue,
        hasActiveTimer: false,
        project: taskData.project ? { id: taskData.project.id, name: taskData.project.name } : { id: projectId, name: 'Projet' }
      }

      // Ajouter ou mettre à jour la tâche dans les listes
      setTasks(prevTasks => {
        const exists = prevTasks.find(t => t.id === taskId)
        if (exists) {
          return prevTasks.map(t => t.id === taskId ? extendedTask : t)
        } else {
          return [...prevTasks, extendedTask]
        }
      })
      
      setFilteredTasks(prevTasks => {
        const exists = prevTasks.find(t => t.id === taskId)
        if (exists) {
          return prevTasks.map(t => t.id === taskId ? extendedTask : t)
        } else {
          return [...prevTasks, extendedTask]
        }
      })
    } catch (err) {
      console.error('Erreur récupération tâche unique:', err)
    }
  }, [supabase, projectId])

  // Fonction pour mettre à jour silencieusement les relations d'une tâche
  const updateSingleTaskRelations = useCallback(async (taskId: string) => {
    try {
      // Récupérer les nouvelles relations
      const [assigneesData, tagsData] = await Promise.all([
        supabase
          .from('task_assignees')
          .select('user_id, users(id, first_name, last_name, email)')
          .eq('task_id', taskId),
        supabase
          .from('task_tags')
          .select('tag_id, tags(id, name, color, project_id)')
          .eq('task_id', taskId)
      ])

      const assignees = assigneesData.data?.map(ta => ({
        id: ta.users.id,
        firstName: ta.users.first_name,
        lastName: ta.users.last_name,
        email: ta.users.email
      })) || []

      const tags = tagsData.data?.map(tt => tt.tags).filter(Boolean) || []

      // Mettre à jour silencieusement les listes
      const updateTaskRelations = (task: TaskExtended) => {
        if (task.id === taskId) {
          return { ...task, assignees, tags }
        }
        return task
      }

      setTasks(prevTasks => prevTasks.map(updateTaskRelations))
      setFilteredTasks(prevTasks => prevTasks.map(updateTaskRelations))
    } catch (err) {
      console.error('Erreur mise à jour relations:', err)
    }
  }, [supabase])

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
        .order('task_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      // Transformer les données en format TaskExtended
      const extendedTasks: TaskExtended[] = (tasksData || []).map(task => {
        const isOverdue = task.due_date && task.status !== 'done' 
          ? new Date(task.due_date) < new Date() 
          : false
        
        return {
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status as TaskStatus,
          priority: task.priority,
          project_id: task.project_id,
          due_date: task.due_date,
          created_at: task.created_at,
          updated_at: task.updated_at,
          tags: task.task_tags?.map(tt => tt.tags).filter(Boolean) || [],
          checklist: [], // À ajouter dans le schéma DB si nécessaire
          comments: [], // À ajouter dans le schéma DB si nécessaire
          attachments: [], // À ajouter dans le schéma DB si nécessaire
          timers: [], // À calculer depuis task_timers si nécessaire
          assignees: task.task_assignees?.map(ta => ({
            id: ta.users.id,
            firstName: ta.users.first_name,
            lastName: ta.users.last_name,
            email: ta.users.email
          })) || [],
          // Champs calculés
          timeLogged: 0, // À calculer depuis task_timers
          checklistProgress: 0, // À calculer quand checklist sera implémenté
          isOverdue,
          hasActiveTimer: false, // À calculer depuis task_timers
          project: task.project ? { id: task.project.id, name: task.project.name } : { id: projectId, name: 'Projet' }
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
  // Gestionnaire des changements de tâches en temps réel
  const handleTaskChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    switch (eventType) {
      case 'INSERT':
        // Nouvelle tâche créée par un autre utilisateur
        if (newRecord.project_id === projectId) {
          // Récupérer la tâche avec ses relations sans recharger tout
          fetchSingleTask(newRecord.id)
        }
        break
        
      case 'UPDATE':
        // Vérifier si ce n'est pas notre propre mise à jour
        const isOwnUpdate = lastLocalUpdate && 
          lastLocalUpdate.taskId === newRecord.id && 
          Date.now() - lastLocalUpdate.timestamp < 2000 // 2 secondes
        
        if (!isOwnUpdate) {
          // Tâche modifiée par un autre utilisateur
          console.log('🔄 Mise à jour externe détectée pour la tâche:', newRecord.id)
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === newRecord.id 
                ? { ...task, ...newRecord, updated_at: newRecord.updated_at }
                : task
            )
          )
          setFilteredTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === newRecord.id 
                ? { ...task, ...newRecord, updated_at: newRecord.updated_at }
                : task
            )
          )
        }
        break
        
      case 'DELETE':
        // Tâche supprimée par un autre utilisateur
        setTasks(prevTasks => prevTasks.filter(task => task.id !== oldRecord.id))
        setFilteredTasks(prevTasks => prevTasks.filter(task => task.id !== oldRecord.id))
        break
    }
  }, [projectId, fetchTasks])
  
  // Gestionnaire des changements de relations (assignees/tags)
  const handleRelationChange = useCallback((payload: any, relationType: 'assignees' | 'tags') => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    // Mise à jour granulaire des relations sans recharger tout
    if (['INSERT', 'DELETE'].includes(eventType)) {
      const taskId = newRecord?.task_id || oldRecord?.task_id
      if (taskId) {
        // Mettre à jour silencieusement la tâche concernée
        updateSingleTaskRelations(taskId)
      }
    }
  }, [])

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
      console.log('🔄 Début mise à jour tâche:', data.id, data)
      
      // Valider les données requises
      if (!data.id) {
        throw new Error('ID de tâche requis pour la mise à jour')
      }
      
      // Construire l'objet de mise à jour avec validation
      const updateData: any = {}
      
      if (data.title !== undefined && data.title.trim() !== '') {
        updateData.title = data.title.trim()
      }
      if (data.description !== undefined) {
        updateData.description = data.description || ''
      }
      if (data.priority !== undefined) {
        updateData.priority = data.priority
      }
      if (data.status !== undefined) {
        updateData.status = data.status
      }
      if (data.dueDate !== undefined) {
        // Gestion du format de date
        if (data.dueDate === null || data.dueDate === '') {
          updateData.due_date = null
        } else {
          // Valider et formater la date
          const date = new Date(data.dueDate)
          if (isNaN(date.getTime())) {
            throw new Error('Format de date invalide')
          }
          updateData.due_date = date.toISOString()
        }
      }
      
      // S'assurer qu'il y a quelque chose à mettre à jour (vérification simple)
      const hasTaskUpdate = Object.keys(updateData).length > 0
      const hasAssigneesUpdate = data.assigneeIds !== undefined
      const hasTagsUpdate = data.tagIds !== undefined
      
      if (!hasTaskUpdate && !hasAssigneesUpdate && !hasTagsUpdate) {
        console.log('⚠️ Aucune donnée à mettre à jour')
        const existingTask = tasks.find(t => t.id === data.id)
        if (existingTask) {
          return existingTask
        }
        throw new Error('Tâche introuvable')
      }
      
      // Mettre à jour la tâche si nécessaire
      if (hasTaskUpdate) {
        // Marquer cette mise à jour comme locale
        setLastLocalUpdate({ taskId: data.id, timestamp: Date.now() })
        
        // Ajouter la timestamp de mise à jour
        updateData.updated_at = new Date().toISOString()
        
        console.log('📤 Données envoyées à Supabase:', updateData)

        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', data.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Erreur Supabase:', updateError)
          throw new Error(`Erreur Supabase: ${updateError.message} (Code: ${updateError.code})`)
        }

        console.log('✅ Tâche mise à jour avec succès:', updatedTask)
      }
      
      // Gestion des assignés
      if (hasAssigneesUpdate) {
        console.log('👥 Mise à jour des assignés:', data.assigneeIds)
        
        // Mise à jour optimiste immédiate
        const currentTask = tasks.find(t => t.id === data.id)
        if (currentTask && data.assigneeIds) {
          const newAssignees = availableUsers.filter(user => data.assigneeIds!.includes(user.id))
          
          const updateTaskAssignees = (task: TaskExtended) => {
            if (task.id === data.id) {
              return { ...task, assignees: newAssignees }
            }
            return task
          }
          
          setTasks(prevTasks => prevTasks.map(updateTaskAssignees))
          setFilteredTasks(prevTasks => prevTasks.map(updateTaskAssignees))
        }
        
        // Supprimer les anciens assignés
        const { error: deleteAssigneesError } = await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', data.id)
        
        if (deleteAssigneesError) {
          console.error('Erreur suppression assignés:', deleteAssigneesError)
        }
        
        // Ajouter les nouveaux assignés
        if (data.assigneeIds && data.assigneeIds.length > 0) {
          const assignments = data.assigneeIds.map(userId => ({
            task_id: data.id,
            user_id: userId,
            assigned_at: new Date().toISOString()
          }))
          
          const { error: insertAssigneesError } = await supabase
            .from('task_assignees')
            .insert(assignments)
          
          if (insertAssigneesError) {
            console.error('Erreur ajout assignés:', insertAssigneesError)
          } else {
            console.log('✅ Assignés mis à jour')
          }
        }
      }
      
      // Gestion des tags
      if (hasTagsUpdate) {
        console.log('🏷️ Mise à jour des tags:', data.tagIds)
        
        // Mise à jour optimiste immédiate
        const currentTask = tasks.find(t => t.id === data.id)
        if (currentTask && data.tagIds) {
          const newTags = availableTags.filter(tag => data.tagIds!.includes(tag.id))
          
          const updateTaskTags = (task: TaskExtended) => {
            if (task.id === data.id) {
              return { ...task, tags: newTags }
            }
            return task
          }
          
          setTasks(prevTasks => prevTasks.map(updateTaskTags))
          setFilteredTasks(prevTasks => prevTasks.map(updateTaskTags))
        }
        
        // Supprimer les anciens tags
        const { error: deleteTagsError } = await supabase
          .from('task_tags')
          .delete()
          .eq('task_id', data.id)
        
        if (deleteTagsError) {
          console.error('Erreur suppression tags:', deleteTagsError)
        }
        
        // Ajouter les nouveaux tags
        if (data.tagIds && data.tagIds.length > 0) {
          const tagAssignments = data.tagIds.map(tagId => ({
            task_id: data.id,
            tag_id: tagId,
            created_at: new Date().toISOString()
          }))
          
          const { error: insertTagsError } = await supabase
            .from('task_tags')
            .insert(tagAssignments)
          
          if (insertTagsError) {
            console.error('Erreur ajout tags:', insertTagsError)
          } else {
            console.log('✅ Tags mis à jour')
          }
        }
      }

      // Mise à jour optimiste du state local
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === data.id) {
            return {
              ...task,
              ...updateData,
              due_date: updateData.due_date,
              updated_at: updateData.updated_at
            }
          }
          return task
        })
      )
      
      setFilteredTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === data.id) {
            return {
              ...task,
              ...updateData,
              due_date: updateData.due_date,
              updated_at: updateData.updated_at
            }
          }
          return task
        })
      )
      
      // Retourner la tâche mise à jour (sans rafraîchir pour éviter de fermer la modal)
      const currentTask = tasks.find(t => t.id === data.id)
      if (currentTask) {
        return {
          ...currentTask,
          title: data.title || currentTask.title,
          description: data.description || currentTask.description,
          priority: data.priority || currentTask.priority,
          status: data.status || currentTask.status,
          due_date: data.dueDate || currentTask.due_date,
          updated_at: new Date().toISOString()
        } as TaskExtended
      }
      
      return currentTask as TaskExtended
    } catch (err) {
      console.error('💥 Erreur complète mise à jour:', err)
      
      // En cas d'erreur, on ne rafraîchit pas pour éviter de fermer la modal
      console.log('Erreur pendant l\'auto-sauvegarde, modal maintenue ouverte')
      
      throw new Error(err instanceof Error ? err.message : 'Erreur mise à jour tâche')
    }
  }, [supabase, fetchTasks, tasks])

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

  // Réorganiser les tâches dans une colonne
  const reorderTasks = useCallback(async (taskId: string, newIndex: number, status: TaskStatus): Promise<void> => {
    try {
      const statusTasks = filteredTasks.filter(task => task.status === status)
      const taskToMove = statusTasks.find(t => t.id === taskId)
      if (!taskToMove) return

      // Calculer le nouvel ordre
      const otherTasks = statusTasks.filter(t => t.id !== taskId)
      const newOrder = newIndex + 1

      // Mettre à jour l'ordre de la tâche déplacée
      await supabase
        .from('tasks')
        .update({ task_order: newOrder })
        .eq('id', taskId)

      // Mettre à jour l'ordre des autres tâches si nécessaire
      for (let i = newIndex; i < otherTasks.length; i++) {
        await supabase
          .from('tasks')
          .update({ task_order: i + 2 })
          .eq('id', otherTasks[i].id)
      }

      // Rafraîchir les données
      await fetchTasks()
    } catch (err) {
      console.error('Erreur réorganisation:', err)
      await fetchTasks()
    }
  }, [supabase, fetchTasks, filteredTasks])

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

  // Charger les utilisateurs
  const loadUsers = useCallback(async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role_id, created_at, updated_at')

      if (error) throw error
      
      const transformedUsers: User[] = (usersData || []).map(user => ({
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        roleId: user.role_id || '',
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: user.updated_at || new Date().toISOString()
      }))
      
      setAvailableUsers(transformedUsers)
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err)
    }
  }, [supabase])

  // Charger les tags du projet
  const loadTags = useCallback(async () => {
    try {
      const { data: tagsData, error } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId)

      if (error) throw error
      setAvailableTags(tagsData || [])
    } catch (err) {
      console.error('Erreur chargement tags:', err)
    }
  }, [supabase, projectId])

  // Charger les tâches au montage et configurer Realtime
  useEffect(() => {
    if (projectId) {
      fetchTasks()
      loadUsers()
      loadTags()
      
      // Configurer les souscriptions Realtime
      const taskChannel = supabase
        .channel('tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `project_id=eq.${projectId}`
          },
          (payload) => {
            console.log('🔄 Changement de tâche détecté:', payload)
            handleTaskChange(payload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_assignees'
          },
          (payload) => {
            console.log('👥 Changement d\'assigné détecté:', payload)
            handleRelationChange(payload, 'assignees')
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_tags'
          },
          (payload) => {
            console.log('🏷️ Changement de tag détecté:', payload)
            handleRelationChange(payload, 'tags')
          }
        )
        .subscribe((status) => {
          console.log('🔌 Statut Realtime:', status)
          setIsRealTimeConnected(status === 'SUBSCRIBED')
        })
      
      // Nettoyage lors du démontage
      return () => {
        supabase.removeChannel(taskChannel)
      }
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
    isRealTimeConnected,
    
    // Actions CRUD
    createTask,
    updateTask,
    deleteTask,
    
    // Actions Kanban
    moveTask,
    reorderTasks,
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