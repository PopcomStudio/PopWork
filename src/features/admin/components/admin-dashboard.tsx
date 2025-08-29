"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icons } from '@/components/ui/icons'
import { Activity, CheckCircle, AlertCircle } from 'lucide-react'
import { createClientComponentClient } from '@/lib/supabase'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { SectionCards } from '@/components/section-cards'

interface DashboardMetrics {
  users: {
    total: number
    active: number
    new: number
    byRole: { role: string; count: number }[]
  }
  projects: {
    total: number
    active: number
    completed: number
    overdue: number
  }
  tasks: {
    total: number
    completed: number
    inProgress: number
    pending: number
  }
  companies: {
    total: number
    active: number
  }
  activity: {
    recent: Array<{ id: string; type: string; user: string; timestamp: string; description: string }>
    dailyStats: { date: string; actions: number }[]
  }
  performance: {
    avgProjectDuration: number
    taskCompletionRate: number
    userProductivity: { user: string; tasks: number }[]
  }
}


export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      
      // Fetch users metrics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, roles(name)')
      
      if (usersError) throw usersError

      // Fetch projects metrics
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
      
      if (projectsError) throw projectsError

      // Fetch tasks metrics
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
      
      if (tasksError) throw tasksError

      // Fetch companies metrics
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
      
      if (companiesError) throw companiesError

      // Fetch recent activity
      const { data: activity, error: activityError } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (activityError) throw activityError

      // Calculate metrics
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Users by role
      const roleGroups = users?.reduce<Record<string, number>>((acc, user) => {
        const roleName = user.roles?.name || 'Aucun rôle'
        acc[roleName] = (acc[roleName] || 0) + 1
        return acc
      }, {})

      const usersByRole = Object.entries(roleGroups || {}).map(([role, count]) => ({
        role,
        count: count as number
      }))

      // Project status
      const activeProjects = projects?.filter(p => p.status === 'in_progress').length || 0
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
      const overdueProjects = projects?.filter(p => {
        return p.status === 'in_progress' && p.end_date && new Date(p.end_date) < now
      }).length || 0

      // Task status
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
      const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0
      const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0

      // Calculate daily activity for the last 7 days
      const dailyStats = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayActivity = activity?.filter(a => {
          const actDate = new Date(a.created_at).toISOString().split('T')[0]
          return actDate === dateStr
        }).length || 0
        
        dailyStats.push({
          date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          actions: dayActivity
        })
      }

      // User productivity (top 5)
      const tasksByUser = tasks?.reduce<Record<string, number>>((acc, task) => {
        if (task.assignee_id) {
          acc[task.assignee_id] = (acc[task.assignee_id] || 0) + 1
        }
        return acc
      }, {})

      const userProductivity = await Promise.all(
        Object.entries(tasksByUser || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(async ([userId, taskCount]) => {
            const { data: user } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', userId)
              .single()
            
            return {
              user: user ? `${user.first_name} ${user.last_name}` : 'Inconnu',
              tasks: taskCount as number
            }
          })
      )

      // Calculate average project duration
      const completedProjectsWithDuration = projects?.filter(p => 
        p.status === 'completed' && p.start_date && p.end_date
      )
      
      const avgProjectDuration = completedProjectsWithDuration?.length 
        ? completedProjectsWithDuration.reduce((sum, p) => {
            const start = new Date(p.start_date).getTime()
            const end = new Date(p.end_date).getTime()
            return sum + (end - start) / (1000 * 60 * 60 * 24)
          }, 0) / completedProjectsWithDuration.length
        : 0

      // Task completion rate
      const taskCompletionRate = tasks?.length 
        ? (completedTasks / tasks.length) * 100 
        : 0

      setMetrics({
        users: {
          total: users?.length || 0,
          active: users?.filter(u => {
            const lastSeen = u.last_sign_in_at || u.created_at
            return new Date(lastSeen) > sevenDaysAgo
          }).length || 0,
          new: users?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0,
          byRole: usersByRole
        },
        projects: {
          total: projects?.length || 0,
          active: activeProjects,
          completed: completedProjects,
          overdue: overdueProjects
        },
        tasks: {
          total: tasks?.length || 0,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: pendingTasks
        },
        companies: {
          total: companies?.length || 0,
          active: companies?.filter(c => c.is_active).length || 0
        },
        activity: {
          recent: activity || [],
          dailyStats
        },
        performance: {
          avgProjectDuration: Math.round(avgProjectDuration),
          taskCompletionRate: Math.round(taskCompletionRate),
          userProductivity
        }
      })

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des métriques')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement du tableau de bord...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) return null

  return (
    <ProtectedRoute requiredPermission="admin.*">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord administrateur</h2>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de l&apos;activité et des performances du système
          </p>
        </div>

        {/* Cartes métriques avec le même style que le dashboard utilisateur */}
        <SectionCards stats={{
          totalProjects: metrics.projects.total,
          activeProjects: metrics.projects.active,
          totalTasks: metrics.tasks.total,
          completedTasks: metrics.tasks.completed,
          totalRevenue: 25000, // Valeur simulée pour l'admin
          pendingInvoices: metrics.projects.overdue
        }} />

        {/* Graphique principal avec la même interface que le dashboard utilisateur */}
        <div className="px-0">
          <ChartAreaInteractive />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu des performances</CardTitle>
              <CardDescription>Métriques système clés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Taux de complétion des tâches</p>
                  <p className="text-2xl font-bold">{metrics.performance.taskCompletionRate}%</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Durée moyenne des projets</p>
                  <p className="text-2xl font-bold">{metrics.performance.avgProjectDuration} jours</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle>Top contributeurs</CardTitle>
              <CardDescription>Utilisateurs les plus productifs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.performance.userProductivity.map((user, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium">{user.user}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold">{user.tasks}</span>
                      <span className="text-xs text-muted-foreground">tâches</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Dernières actions dans le système</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.activity.recent.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{activity.action || 'Action'}</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.entity_type || 'Ressource'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
              {metrics.activity.recent.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Aucune activité récente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Durée moyenne des projets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.performance.avgProjectDuration} jours
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pour les projets terminés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projets en cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Actifs</span>
                  <span className="font-bold">{metrics.projects.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Terminés</span>
                  <span className="font-bold">{metrics.projects.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-destructive">En retard</span>
                  <span className="font-bold text-destructive">{metrics.projects.overdue}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">{metrics.users.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Actifs (7j)</span>
                  <span className="font-bold">{metrics.users.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Nouveaux (30j)</span>
                  <span className="font-bold">{metrics.users.new}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}