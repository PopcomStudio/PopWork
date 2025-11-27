"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  CheckCircle2,
  MessageSquare,
  Upload,
  UserPlus,
  UserMinus,
  PenLine,
  Plus,
  FolderCog,
} from 'lucide-react'
import type { ActivityItem, ActivityType } from '../../hooks/use-project-activity'

interface ProjectRecentActivityProps {
  activities: ActivityItem[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: typeof Activity
  label: string
  color: string
}> = {
  task_created: {
    icon: Plus,
    label: 'a cree la tache',
    color: 'text-blue-500',
  },
  task_completed: {
    icon: CheckCircle2,
    label: 'a termine la tache',
    color: 'text-green-500',
  },
  task_updated: {
    icon: PenLine,
    label: 'a modifie la tache',
    color: 'text-gray-500',
  },
  comment_added: {
    icon: MessageSquare,
    label: 'a commente sur',
    color: 'text-purple-500',
  },
  file_uploaded: {
    icon: Upload,
    label: 'a uploade',
    color: 'text-orange-500',
  },
  member_added: {
    icon: UserPlus,
    label: 'a ajoute',
    color: 'text-green-500',
  },
  member_removed: {
    icon: UserMinus,
    label: 'a retire',
    color: 'text-red-500',
  },
  project_updated: {
    icon: FolderCog,
    label: 'a modifie le projet',
    color: 'text-blue-500',
  },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "a l'instant"
  if (diffMins < 60) return `il y a ${diffMins}m`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

interface ActivityItemRowProps {
  activity: ActivityItem
}

function ActivityItemRow({ activity }: ActivityItemRowProps) {
  const config = ACTIVITY_CONFIG[activity.type]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 py-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">
          {activity.userInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{activity.userName}</span>
          <Icon className={`h-3.5 w-3.5 ${config.color} shrink-0`} />
          <span className="text-sm text-muted-foreground">{config.label}</span>
          <span className="text-sm font-medium truncate">"{activity.targetName}"</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 py-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function ProjectRecentActivity({
  activities,
  loading,
  hasMore,
  onLoadMore,
}: ProjectRecentActivityProps) {
  if (loading && activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activite recente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[1, 2, 3].map((i) => (
            <ActivitySkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activite recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune activite recente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activite recente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="divide-y">
          {activities.map((activity) => (
            <ActivityItemRow key={activity.id} activity={activity} />
          ))}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Chargement...' : 'Voir plus'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
