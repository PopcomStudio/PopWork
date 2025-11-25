"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { Project } from './use-projects'
import type { ProjectMemberWithUser } from '../types/project-members'
import type { ProjectDeliverable } from '@/shared/types/database'

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project_id: string
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignees?: {
    user_id: string
    user: {
      id: string
      first_name: string
      last_name: string
    }
  }[]
}

export type HealthStatus = 'good' | 'warning' | 'critical'

export interface ProjectOverviewStats {
  healthScore: number
  healthStatus: HealthStatus
  tasksByStatus: {
    todo: number
    in_progress: number
    review: number
    done: number
  }
  tasksByPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  overdueTasks: Task[]
  upcomingTasks: Task[]
  teamByRole: Record<string, number>
  deliverableProgress: number
  daysRemaining: number | null
  timeSpent: {
    total: number
    thisWeek: number
  }
}

export interface ProjectOverviewData {
  project: Project | null
  tasks: Task[]
  members: ProjectMemberWithUser[]
  deliverables: ProjectDeliverable[]
  stats: ProjectOverviewStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function calculateHealthScore(
  tasks: Task[],
  deliverables: ProjectDeliverable[]
): { score: number; status: HealthStatus } {
  let score = 100

  // Task completion rate (40 points max)
  if (tasks.length > 0) {
    const completionRate = tasks.filter(t => t.status === 'done').length / tasks.length
    score = score - (40 * (1 - completionRate))
  }

  // Overdue tasks penalty (-10 points each, max -30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueTasks = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < today && t.status !== 'done'
  )
  score = score - Math.min(overdueTasks.length * 10, 30)

  // Deliverables progress (30 points max)
  if (deliverables.length > 0) {
    const completedDeliverables = deliverables.filter(
      d => d.status === 'completed' || d.status === 'validated'
    ).length
    const deliverableRate = completedDeliverables / deliverables.length
    score = score - (30 * (1 - deliverableRate))
  }

  score = Math.max(0, Math.round(score))

  return {
    score,
    status: score >= 70 ? 'good' : score >= 40 ? 'warning' : 'critical'
  }
}

export function useProjectOverview(projectId: string): ProjectOverviewData {
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMemberWithUser[]>([])
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([])
  const [timeEntries, setTimeEntries] = useState<{ total: number; thisWeek: number }>({ total: 0, thisWeek: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [projectRes, tasksRes, membersRes, deliverablesRes, timeRes] = await Promise.all([
        // Project
        supabase
          .from('projects')
          .select(`
            id, name, description, status, company_id, service_id,
            start_date, end_date, created_at, updated_at,
            companies!inner(name),
            services!inner(name),
            tasks(id, status)
          `)
          .eq('id', projectId)
          .single(),

        // Tasks with assignees
        supabase
          .from('tasks')
          .select(`
            id, title, description, status, priority, project_id,
            start_date, due_date, created_at, updated_at,
            task_assignees(
              user_id,
              users(id, first_name, last_name)
            )
          `)
          .eq('project_id', projectId)
          .order('due_date', { ascending: true, nullsFirst: false }),

        // Project assignees (members)
        supabase
          .from('project_assignees')
          .select(`
            id, project_id, user_id, role, assigned_at,
            users(id, first_name, last_name, email, avatar_url, role_id,
              roles(name)
            )
          `)
          .eq('project_id', projectId),

        // Deliverables
        supabase
          .from('project_deliverables')
          .select(`
            id, project_id, name, description, status, due_date,
            completed_at, validated, validated_at, display_order,
            created_at, updated_at,
            deliverable_items(id, name, status, completed, display_order)
          `)
          .eq('project_id', projectId)
          .order('display_order', { ascending: true }),

        // Time entries for this project's tasks
        supabase
          .from('time_entries')
          .select('duration, created_at, tasks!inner(project_id)')
          .eq('tasks.project_id', projectId)
      ])

      // Handle project data
      if (projectRes.error) throw projectRes.error
      const projectData = projectRes.data
      const company = Array.isArray(projectData.companies) ? projectData.companies[0] : projectData.companies
      const service = Array.isArray(projectData.services) ? projectData.services[0] : projectData.services
      const projectTasks = projectData.tasks || []

      setProject({
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        company_id: projectData.company_id,
        service_id: projectData.service_id,
        company_name: company?.name || '',
        service_name: service?.name || '',
        task_count: projectTasks.length,
        completed_tasks: projectTasks.filter((t: { status: string }) => t.status === 'done').length,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        created_at: projectData.created_at,
        updated_at: projectData.updated_at,
      })

      // Handle tasks data
      if (tasksRes.error) throw tasksRes.error
      const mappedTasks: Task[] = (tasksRes.data || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.project_id,
        start_date: task.start_date,
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
        assignees: (task.task_assignees || []).map((ta: any) => ({
          user_id: ta.user_id,
          user: Array.isArray(ta.users) ? ta.users[0] : ta.users
        }))
      }))
      setTasks(mappedTasks)

      // Handle members data
      if (membersRes.error && membersRes.error.code !== 'PGRST116') {
        console.warn('Members fetch warning:', membersRes.error)
      }
      const mappedMembers: ProjectMemberWithUser[] = (membersRes.data || []).map((m: any) => {
        const user = Array.isArray(m.users) ? m.users[0] : m.users
        const role = user?.roles ? (Array.isArray(user.roles) ? user.roles[0] : user.roles) : null
        return {
          id: m.id,
          projectId: m.project_id,
          userId: m.user_id,
          role: m.role,
          assignedAt: m.assigned_at,
          user: {
            id: user?.id || '',
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            email: user?.email || '',
            avatarUrl: user?.avatar_url,
            globalRole: role?.name || 'Utilisateur'
          }
        }
      })
      setMembers(mappedMembers)

      // Handle deliverables data
      if (deliverablesRes.error && deliverablesRes.error.code !== 'PGRST116') {
        console.warn('Deliverables fetch warning:', deliverablesRes.error)
      }
      const mappedDeliverables: ProjectDeliverable[] = (deliverablesRes.data || []).map((d: any) => ({
        ...d,
        items: d.deliverable_items || []
      }))
      setDeliverables(mappedDeliverables)

      // Handle time entries
      if (!timeRes.error) {
        const entries = timeRes.data || []
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)

        let total = 0
        let thisWeek = 0
        entries.forEach((entry: any) => {
          const duration = entry.duration || 0
          total += duration
          if (new Date(entry.created_at) >= weekStart) {
            thisWeek += duration
          }
        })
        setTimeEntries({ total, thisWeek })
      }

    } catch (err) {
      console.error('Error fetching project overview:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats
  const stats = useMemo((): ProjectOverviewStats => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    // Tasks by status
    const tasksByStatus = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    }

    // Tasks by priority
    const tasksByPriority = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
    }

    // Overdue tasks
    const overdueTasks = tasks.filter(t =>
      t.due_date && new Date(t.due_date) < today && t.status !== 'done'
    )

    // Upcoming tasks (due within 7 days, not done)
    const upcomingTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      const dueDate = new Date(t.due_date)
      return dueDate >= today && dueDate <= weekFromNow
    }).slice(0, 5)

    // Team by role
    const teamByRole: Record<string, number> = {}
    members.forEach(m => {
      const role = m.role || 'other'
      teamByRole[role] = (teamByRole[role] || 0) + 1
    })

    // Deliverable progress
    let deliverableProgress = 0
    if (deliverables.length > 0) {
      const completed = deliverables.filter(d => d.status === 'completed' || d.status === 'validated').length
      deliverableProgress = Math.round((completed / deliverables.length) * 100)
    }

    // Days remaining
    let daysRemaining: number | null = null
    if (project?.end_date) {
      const endDate = new Date(project.end_date)
      const diffTime = endDate.getTime() - today.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Health score
    const { score: healthScore, status: healthStatus } = calculateHealthScore(tasks, deliverables)

    return {
      healthScore,
      healthStatus,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      upcomingTasks,
      teamByRole,
      deliverableProgress,
      daysRemaining,
      timeSpent: timeEntries,
    }
  }, [tasks, members, deliverables, project, timeEntries])

  return {
    project,
    tasks,
    members,
    deliverables,
    stats,
    loading,
    error,
    refetch: fetchData,
  }
}
