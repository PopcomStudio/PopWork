"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building,
  Calendar,
  FileText,
  Clock,
  Archive,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { Project } from '../../hooks/use-projects'

interface ProjectInfoSidebarProps {
  project: Project
}

const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    icon: FileText,
    color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
  },
  active: {
    label: 'Actif',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
  },
  completed: {
    label: 'Termine',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  },
  archived: {
    label: 'Archive',
    icon: Archive,
    color: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400',
  },
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ProjectInfoSidebar({ project }: ProjectInfoSidebarProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const statusConfig = STATUS_CONFIG[project.status]
  const StatusIcon = statusConfig.icon

  const description = project.description || ''
  const shouldTruncate = description.length > 150
  const displayDescription = shouldTruncate && !showFullDescription
    ? description.substring(0, 150) + '...'
    : description

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Informations du projet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Entreprise</p>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{project.company_name}</span>
          </div>
        </div>

        {/* Service */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Service</p>
          <Badge variant="secondary" className="text-xs">
            {project.service_name}
          </Badge>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Statut</p>
          <Badge className={statusConfig.color}>
            <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          {project.start_date && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Debut</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{formatDate(project.start_date)}</span>
              </div>
            </div>
          )}
          {project.end_date && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Fin</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{formatDate(project.end_date)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Created date */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cree le</p>
          <span className="text-sm">{formatDate(project.created_at)}</span>
        </div>

        {/* Description */}
        {description && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displayDescription}
            </p>
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? (
                  <>
                    Voir moins <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Voir plus <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
