"use client"

import { useEffect, useRef, useState } from 'react'
import { useTasks, type Task } from '../hooks/use-tasks'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

interface ProjectGanttViewProps {
  projectId: string
}

type ViewMode = 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GanttInstance = any

export function ProjectGanttView({ projectId }: ProjectGanttViewProps) {
  const { tasks, loading, error, updateTask } = useTasks(projectId)
  const ganttRef = useRef<HTMLDivElement>(null)
  const ganttInstanceRef = useRef<GanttInstance>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('Day')
  const [GanttLib, setGanttLib] = useState<GanttInstance>(null)

  // Charger frappe-gantt dynamiquement côté client
  useEffect(() => {
    // Charger le CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/frappe-gantt.css'
    document.head.appendChild(link)

    // Charger la bibliothèque
    import('frappe-gantt').then((module) => {
      setGanttLib(() => module.default)
    })

    return () => {
      // Nettoyer le lien CSS si besoin
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }
  }, [])

  useEffect(() => {
    if (!ganttRef.current || loading || tasks.length === 0 || !GanttLib) return

    // Transformer les tâches au format Frappe Gantt
    const ganttTasks = tasks.map((task: Task) => {
      // Calculer les dates
      const start = task.created_at ? new Date(task.created_at) : new Date()
      let end = task.due_date ? new Date(task.due_date) : new Date(start)

      // Si la date de fin est avant la date de début, ajuster
      if (end <= start) {
        end = new Date(start)
        end.setDate(end.getDate() + 1)
      }

      // Calculer le progrès basé sur le statut
      const progress = task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : 0

      return {
        id: task.id,
        name: task.title,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        progress: progress,
        dependencies: '', // Pour l'instant, pas de dépendances
        custom_class: task.status === 'done' ? 'gantt-task-done' : task.status === 'in_progress' ? 'gantt-task-in-progress' : 'gantt-task-todo',
      }
    })

    // Créer ou mettre à jour l'instance Gantt
    try {
      if (ganttInstanceRef.current) {
        ganttInstanceRef.current.refresh(ganttTasks)
      } else {
        ganttInstanceRef.current = new GanttLib(ganttRef.current, ganttTasks, {
          view_mode: viewMode,
          date_format: 'YYYY-MM-DD',
          language: 'fr',
          custom_popup_html: function(task: any) {
            const taskData = tasks.find(t => t.id === task.id)
            if (!taskData) return ''

            const assignees = taskData.assignees
              .map(a => `${a.user.first_name} ${a.user.last_name}`)
              .join(', ')

            return `
              <div class="gantt-popup">
                <h3>${task.name}</h3>
                ${taskData.description ? `<p>${taskData.description}</p>` : ''}
                <p><strong>Statut:</strong> ${
                  task.progress === 100 ? 'Terminé' : task.progress === 50 ? 'En cours' : 'À faire'
                }</p>
                ${assignees ? `<p><strong>Assigné à:</strong> ${assignees}</p>` : ''}
                <p><strong>Début:</strong> ${new Date(task._start).toLocaleDateString('fr-FR')}</p>
                <p><strong>Fin:</strong> ${new Date(task._end).toLocaleDateString('fr-FR')}</p>
              </div>
            `
          },
          on_date_change: async (task: any, start: Date, end: Date) => {
            const taskData = tasks.find(t => t.id === task.id)
            if (!taskData) return

            try {
              await updateTask({
                id: task.id,
                title: taskData.title,
                description: taskData.description || undefined,
                status: taskData.status,
                priority: taskData.priority,
                project_id: projectId,
                due_date: end.toISOString().split('T')[0],
              })
            } catch (err) {
              console.error('Erreur lors de la mise à jour de la tâche:', err)
            }
          },
          on_progress_change: async (task: any, progress: number) => {
            const taskData = tasks.find(t => t.id === task.id)
            if (!taskData) return

            // Déterminer le nouveau statut basé sur le progrès
            let newStatus: 'todo' | 'in_progress' | 'done' = 'todo'
            if (progress === 100) {
              newStatus = 'done'
            } else if (progress > 0) {
              newStatus = 'in_progress'
            }

            try {
              await updateTask({
                id: task.id,
                title: taskData.title,
                description: taskData.description || undefined,
                status: newStatus,
                priority: taskData.priority,
                project_id: projectId,
                due_date: taskData.due_date || undefined,
              })
            } catch (err) {
              console.error('Erreur lors de la mise à jour de la tâche:', err)
            }
          },
        })
      }
    } catch (err) {
      console.error('Erreur lors de la création du Gantt:', err)
    }

    return () => {
      // Cleanup si nécessaire
    }
  }, [tasks, loading, viewMode, projectId, updateTask, GanttLib])

  // Changer le mode de vue
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (ganttInstanceRef.current) {
      ganttInstanceRef.current.change_view_mode(mode)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucune tâche</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez des tâches à votre projet pour voir le diagramme de Gantt.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Diagramme de Gantt
        </h3>

        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value) => handleViewModeChange(value as ViewMode)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quarter Day">Quart de jour</SelectItem>
              <SelectItem value="Half Day">Demi-jour</SelectItem>
              <SelectItem value="Day">Jour</SelectItem>
              <SelectItem value="Week">Semaine</SelectItem>
              <SelectItem value="Month">Mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Container du Gantt */}
      <Card className="p-4 overflow-x-auto">
        <div ref={ganttRef} className="gantt-container" />
      </Card>

      {/* Légende */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Terminé</span>
          </div>
        </div>
      </Card>

      {/* Styles personnalisés pour le Gantt */}
      <style jsx global>{`
        .gantt-container {
          min-height: 400px;
        }

        .gantt-task-done .bar {
          fill: #22c55e !important;
        }

        .gantt-task-in-progress .bar {
          fill: #f97316 !important;
        }

        .gantt-task-todo .bar {
          fill: #3b82f6 !important;
        }

        .gantt-popup {
          padding: 12px;
          min-width: 200px;
        }

        .gantt-popup h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .gantt-popup p {
          font-size: 12px;
          margin-bottom: 4px;
          color: #666;
        }

        .gantt-popup strong {
          font-weight: 600;
          color: #333;
        }
      `}</style>
    </div>
  )
}
