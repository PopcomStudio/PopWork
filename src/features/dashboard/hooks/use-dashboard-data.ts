"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface DashboardProject {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  companyName: string
  serviceName: string
  taskCount: number
  completedTasks: number
  createdAt: string
  updatedAt: string
}

export interface DashboardTask {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  projectName: string
  companyName: string
  assignedTo: string[]
  dueDate: string | null
  createdAt: string
}

export interface DashboardTimer {
  id: string
  taskTitle: string
  projectName: string
  userName: string
  startTime: string
  endTime: string | null
  duration: number | null
  createdAt: string
}

export interface DashboardInvoice {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  amount: number
  companyName: string
  serviceName: string
  dueDate: string
  createdAt: string
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  totalRevenue: number
  pendingInvoices: number
}

export interface DashboardNotification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export function useDashboardData() {
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [timers, setTimers] = useState<DashboardTimer[]>([])
  const [invoices, setInvoices] = useState<DashboardInvoice[]>([])
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Récupérer les projets avec statistiques
  const fetchProjects = async (): Promise<DashboardProject[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        companies!inner(name),
        services!inner(name),
        tasks(id, status)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map((project: any) => {
      // Gérer les relations Supabase (peuvent être objet ou tableau)
      const company = Array.isArray(project.companies) ? project.companies[0] : project.companies
      const service = Array.isArray(project.services) ? project.services[0] : project.services
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        companyName: company?.name || '',
        serviceName: service?.name || '',
        taskCount: project.tasks?.length || 0,
        completedTasks: project.tasks?.filter((task: any) => task.status === 'done').length || 0,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      }
    })
  }

  // Récupérer les tâches avec assignations
  const fetchTasks = async (): Promise<DashboardTask[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        created_at,
        projects!inner(
          name,
          companies!inner(name)
        ),
        task_assignees(
          users!inner(first_name, last_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return data.map((task: any) => {
      // Gérer les relations Supabase (peuvent être objet ou tableau)
      const project = Array.isArray(task.projects) ? task.projects[0] : task.projects
      const company = project ? (Array.isArray(project.companies) ? project.companies[0] : project.companies) : null
      
      // Gérer les assignations
      const assignees = task.task_assignees?.map((assignment: any) => {
        const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users
        if (user && user.first_name && user.last_name) {
          return `${user.first_name} ${user.last_name}`.trim()
        }
        return null
      }).filter((name: string | null) => name) || []

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        projectName: project?.name || '',
        companyName: company?.name || '',
        assignedTo: assignees,
        dueDate: task.due_date,
        createdAt: task.created_at,
      }
    })
  }

  // Récupérer les timers récents
  const fetchTimers = async (): Promise<DashboardTimer[]> => {
    const { data, error } = await supabase
      .from('task_timers')
      .select(`
        id,
        start_time,
        end_time,
        duration,
        created_at,
        tasks!inner(
          title,
          projects!inner(name)
        ),
        users!inner(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return data.map(timer => ({
      id: timer.id,
      taskTitle: timer.tasks[0]?.title || '',
      projectName: timer.tasks[0]?.projects[0]?.name || '',
      userName: `${timer.users[0]?.first_name} ${timer.users[0]?.last_name}`,
      startTime: timer.start_time,
      endTime: timer.end_time,
      duration: timer.duration,
      createdAt: timer.created_at,
    }))
  }

  // Récupérer les factures
  const fetchInvoices = async (): Promise<DashboardInvoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        number,
        status,
        amount,
        due_date,
        created_at,
        companies!inner(name),
        services!inner(name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: parseFloat(invoice.amount.toString()),
      companyName: invoice.companies[0]?.name || '',
      serviceName: invoice.services[0]?.name || '',
      dueDate: invoice.due_date,
      createdAt: invoice.created_at,
    }))
  }

  // Récupérer les notifications de l'utilisateur courant
  const fetchNotifications = async (): Promise<DashboardNotification[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        message,
        read,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return data.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.read,
      createdAt: notification.created_at,
    }))
  }

  // Calculer les statistiques du dashboard
  const calculateStats = (
    projectsData: DashboardProject[],
    tasksData: DashboardTask[],
    invoicesData: DashboardInvoice[]
  ): DashboardStats => {
    const totalProjects = projectsData.length
    const activeProjects = projectsData.filter(p => p.status === 'active').length
    const totalTasks = tasksData.length
    const completedTasks = tasksData.filter(t => t.status === 'done').length
    const totalRevenue = invoicesData
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0)
    const pendingInvoices = invoicesData.filter(i => i.status === 'sent').length

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      totalRevenue,
      pendingInvoices,
    }
  }

  // Charger toutes les données
  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const [
        projectsData,
        tasksData,
        timersData,
        invoicesData,
        notificationsData,
      ] = await Promise.all([
        fetchProjects(),
        fetchTasks(),
        fetchTimers(),
        fetchInvoices(),
        fetchNotifications(),
      ])

      setProjects(projectsData)
      setTasks(tasksData)
      setTimers(timersData)
      setInvoices(invoicesData)
      setNotifications(notificationsData)
      setStats(calculateStats(projectsData, tasksData, invoicesData))

    } catch (err) {
      console.error('Erreur lors du chargement des données du dashboard:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Marquer une notification comme lue
  const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      )
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la notification:', err)
    }
  }

  // Charger les données au montage du composant
  useEffect(() => {
    loadDashboardData()
  }, [])

  return {
    // Données
    projects,
    tasks,
    timers,
    invoices,
    notifications,
    stats,
    
    // État
    loading,
    error,
    
    // Actions
    refetch: loadDashboardData,
    markNotificationAsRead,
  }
} 