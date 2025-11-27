"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Columns,
  Calendar,
  Settings,
  Folder,
  ArrowRight,
} from 'lucide-react'

interface ProjectQuickLinksProps {
  onNavigate: (tab: string) => void
}

const QUICK_LINKS = [
  {
    id: 'kanban',
    label: 'Voir les taches',
    icon: Columns,
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: Calendar,
  },
  {
    id: 'administration',
    label: 'Documents',
    icon: Settings,
  },
  {
    id: 'files',
    label: 'Fichiers',
    icon: Folder,
  },
]

export function ProjectQuickLinks({ onNavigate }: ProjectQuickLinksProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Acces rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Button
              key={link.id}
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
              onClick={() => onNavigate(link.id)}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {link.label}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
