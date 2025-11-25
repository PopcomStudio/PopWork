"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AlertTriangle, Clock, CalendarClock } from 'lucide-react'
import type { Task } from '../../hooks/use-project-overview'

interface ProjectUpcomingDeadlinesProps {
  overdueTasks: Task[]
  upcomingTasks: Task[]
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
}

const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

function getDaysUntil(dateString: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface TaskItemProps {
  task: Task
  isOverdue?: boolean
}

function TaskItem({ task, isOverdue = false }: TaskItemProps) {
  const firstAssignee = task.assignees?.[0]

  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg ${isOverdue ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-muted/50'}`}>
      <Badge className={`${PRIORITY_COLORS[task.priority]} text-xs shrink-0`}>
        {PRIORITY_LABELS[task.priority]}
      </Badge>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3 w-3" />
          <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
            {task.due_date && formatDate(task.due_date)}
          </span>
          {firstAssignee && (
            <>
              <span>|</span>
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px]">
                  {firstAssignee.user.first_name.charAt(0)}{firstAssignee.user.last_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProjectUpcomingDeadlines({
  overdueTasks,
  upcomingTasks,
}: ProjectUpcomingDeadlinesProps) {
  const hasOverdue = overdueTasks.length > 0
  const hasUpcoming = upcomingTasks.length > 0

  // Split upcoming into "this week" and "later"
  const thisWeekTasks = upcomingTasks.filter(t => t.due_date && getDaysUntil(t.due_date) <= 7)
  const laterTasks = upcomingTasks.filter(t => t.due_date && getDaysUntil(t.due_date) > 7).slice(0, 3)

  if (!hasOverdue && !hasUpcoming) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Echeances a venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune echeance a venir
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Echeances a venir
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Section */}
        {hasOverdue && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide font-medium">
                En retard ({overdueTasks.length})
              </p>
            </div>
            <div className="space-y-1">
              {overdueTasks.slice(0, 3).map((task) => (
                <TaskItem key={task.id} task={task} isOverdue />
              ))}
              {overdueTasks.length > 3 && (
                <p className="text-xs text-muted-foreground pl-2">
                  +{overdueTasks.length - 3} autres en retard
                </p>
              )}
            </div>
          </div>
        )}

        {/* This Week Section */}
        {thisWeekTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide font-medium">
              Cette semaine ({thisWeekTasks.length})
            </p>
            <div className="space-y-1">
              {thisWeekTasks.slice(0, 3).map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Later Section */}
        {laterTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              A venir
            </p>
            <div className="space-y-1">
              {laterTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
