"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListChecks } from 'lucide-react'

interface ProjectTaskBreakdownProps {
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
}

const STATUS_CONFIG = [
  { key: 'todo', label: 'A faire', color: 'bg-gray-400' },
  { key: 'in_progress', label: 'En cours', color: 'bg-blue-500' },
  { key: 'review', label: 'En revue', color: 'bg-purple-500' },
  { key: 'done', label: 'Termine', color: 'bg-green-500' },
] as const

const PRIORITY_CONFIG = [
  { key: 'low', label: 'Basse', color: 'bg-gray-400' },
  { key: 'medium', label: 'Moyenne', color: 'bg-yellow-500' },
  { key: 'high', label: 'Haute', color: 'bg-orange-500' },
  { key: 'urgent', label: 'Urgente', color: 'bg-red-500' },
] as const

interface BreakdownBarProps {
  label: string
  count: number
  total: number
  color: string
}

function BreakdownBar({ label, count, total, color }: BreakdownBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function ProjectTaskBreakdown({
  tasksByStatus,
  tasksByPriority,
}: ProjectTaskBreakdownProps) {
  const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0)

  if (totalTasks === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Repartition des taches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune tache dans ce projet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Repartition des taches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
          {/* By Status */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Par statut
            </p>
            <div className="space-y-3">
              {STATUS_CONFIG.map(({ key, label, color }) => (
                <BreakdownBar
                  key={key}
                  label={label}
                  count={tasksByStatus[key]}
                  total={totalTasks}
                  color={color}
                />
              ))}
            </div>
          </div>

          {/* By Priority */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Par priorite
            </p>
            <div className="space-y-3">
              {PRIORITY_CONFIG.map(({ key, label, color }) => (
                <BreakdownBar
                  key={key}
                  label={label}
                  count={tasksByPriority[key]}
                  total={totalTasks}
                  color={color}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
