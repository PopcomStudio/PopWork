"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Heart,
  TrendingUp,
  Clock,
  Timer,
  Users,
} from 'lucide-react'
import type { HealthStatus } from '../../hooks/use-project-overview'
import type { ProjectMemberWithUser } from '../../types/project-members'

interface ProjectKPICardsProps {
  healthScore: number
  healthStatus: HealthStatus
  progressPercent: number
  completedTasks: number
  totalTasks: number
  daysRemaining: number | null
  timeSpent: {
    total: number
    thisWeek: number
  }
  members: ProjectMemberWithUser[]
}

const HEALTH_CONFIG = {
  good: {
    label: 'Bon',
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    cardBg: 'bg-green-50/50 dark:bg-green-950/10',
  },
  warning: {
    label: 'Attention',
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400',
    cardBg: 'bg-orange-50/50 dark:bg-orange-950/10',
  },
  critical: {
    label: 'Critique',
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400',
    cardBg: 'bg-red-50/50 dark:bg-red-950/10',
  },
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function ProjectKPICards({
  healthScore,
  healthStatus,
  progressPercent,
  completedTasks,
  totalTasks,
  daysRemaining,
  timeSpent,
  members,
}: ProjectKPICardsProps) {
  const healthConfig = HEALTH_CONFIG[healthStatus]
  const isOverdue = daysRemaining !== null && daysRemaining < 0
  const visibleMembers = members.slice(0, 4)
  const overflowCount = members.length - 4

  return (
    <div className="grid grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-5 gap-4">
      {/* Health Score */}
      <Card className={healthConfig.cardBg}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sante du projet</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{healthScore}</span>
                <Badge className={healthConfig.color}>{healthConfig.label}</Badge>
              </div>
            </div>
            <Heart className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-sm text-muted-foreground">Progression</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{progressPercent}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={progressPercent} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground ml-2" />
          </div>
        </CardContent>
      </Card>

      {/* Time Remaining */}
      <Card className={isOverdue ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Temps restant</p>
              {daysRemaining !== null ? (
                <div className="flex items-center gap-2">
                  {isOverdue ? (
                    <>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {Math.abs(daysRemaining)}j
                      </span>
                      <Badge variant="destructive">En retard</Badge>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">{daysRemaining}j</span>
                      {daysRemaining <= 7 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Bientot
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xl font-medium text-muted-foreground">Non defini</span>
              )}
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Time Spent */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Temps passe</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{formatDuration(timeSpent.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cette semaine: {formatDuration(timeSpent.thisWeek)}
              </p>
            </div>
            <Timer className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Equipe</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{members.length}</span>
                <span className="text-sm text-muted-foreground">membres</span>
              </div>
              <div className="flex -space-x-2">
                {visibleMembers.map((member) => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {member.user.firstName.charAt(0)}{member.user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {overflowCount > 0 && (
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted border-2 border-background text-xs font-medium">
                    +{overflowCount}
                  </div>
                )}
              </div>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
