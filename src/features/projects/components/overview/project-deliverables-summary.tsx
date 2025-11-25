"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { ProjectDeliverable } from '@/shared/types/database'

interface ProjectDeliverablesSummaryProps {
  deliverables: ProjectDeliverable[]
  onNavigateToAdmin: () => void
}

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  in_progress: {
    label: 'En cours',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  completed: {
    label: 'Termine',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  validated: {
    label: 'Valide',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
}

interface DeliverableItemProps {
  deliverable: ProjectDeliverable
}

function DeliverableItem({ deliverable }: DeliverableItemProps) {
  const statusConfig = STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.pending
  const items = deliverable.items || []
  const completedItems = items.filter(i => i.completed).length
  const totalItems = items.length
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-2 p-2 rounded-lg hover:bg-muted/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate flex-1">{deliverable.name}</span>
        <Badge className={`${statusConfig.color} text-xs shrink-0`}>
          {statusConfig.label}
        </Badge>
      </div>
      {totalItems > 0 && (
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedItems}/{totalItems}
          </span>
        </div>
      )}
    </div>
  )
}

export function ProjectDeliverablesSummary({
  deliverables,
  onNavigateToAdmin,
}: ProjectDeliverablesSummaryProps) {
  const topDeliverables = deliverables.slice(0, 5)
  const completedCount = deliverables.filter(
    d => d.status === 'completed' || d.status === 'validated'
  ).length
  const totalCount = deliverables.length
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (deliverables.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Livrables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun livrable defini
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
            onClick={onNavigateToAdmin}
          >
            Configurer les livrables
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Livrables
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression globale</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Deliverables List */}
        <div className="space-y-1">
          {topDeliverables.map((deliverable) => (
            <DeliverableItem key={deliverable.id} deliverable={deliverable} />
          ))}
        </div>

        {/* More Link */}
        {deliverables.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{deliverables.length - 5} autres livrables
          </p>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={onNavigateToAdmin}
        >
          Voir tous les livrables
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
