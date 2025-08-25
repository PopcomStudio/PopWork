"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icons } from '@/components/ui/icons'
import { Users, Briefcase, FileText, Activity, CheckCircle, AlertCircle } from 'lucide-react'
import { createClientComponentClient } from '@/lib/supabase'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell
} from 'recharts'

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.users.active}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.users.new} nouveaux ce mois
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projets actifs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.projects.active}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.projects.overdue > 0 && (
                  <span className="text-destructive">{metrics.projects.overdue} en retard</span>
                )}
                {metrics.projects.overdue === 0 && "Tous dans les délais"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tâches complétées</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.tasks.completed}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.performance.taskCompletionRate}% taux de complétion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entreprises actives</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.companies.active}</div>
              <p className="text-xs text-muted-foreground">
                Sur {metrics.companies.total} au total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Activity Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Activité de la semaine</CardTitle>
              <CardDescription>Nombre d&apos;actions par jour</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.activity.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="actions" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Répartition des utilisateurs</CardTitle>
              <CardDescription>Par rôle</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.users.byRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ role, count }) => `${role}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {metrics.users.byRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Task Status */}
          <Card>
            <CardHeader>
              <CardTitle>État des tâches</CardTitle>
              <CardDescription>Répartition globale</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={[
                    { status: 'En attente', count: metrics.tasks.pending },
                    { status: 'En cours', count: metrics.tasks.inProgress },
                    { status: 'Terminées', count: metrics.tasks.completed }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top contributeurs</CardTitle>
              <CardDescription>Utilisateurs les plus productifs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.performance.userProductivity.map((user, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{index + 1}.</span>
                      <span className="text-sm">{user.user}</span>
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