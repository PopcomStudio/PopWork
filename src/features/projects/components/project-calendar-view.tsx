"use client"

import { useMemo, useState } from 'react'
import { useTasks, type Task } from '../hooks/use-tasks'
import { EventCalendar } from '@/features/calendar/components/event-calendar'
import { CalendarEvent } from '@/features/calendar/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProjectCalendarViewProps {
  projectId: string
}

const priorityColors = {
  low: 'emerald',
  medium: 'amber',
  high: 'rose',
} as const

const statusLabels = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
} as const

export function ProjectCalendarView({ projectId }: ProjectCalendarViewProps) {
  const { tasks, loading, error, fetchTasks } = useTasks(projectId)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Convertir les tâches en événements de calendrier
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return tasks
      .filter(task => task.due_date || task.start_date) // Seulement les tâches avec des dates
      .map(task => {
        const startDate = task.start_date ? new Date(task.start_date) : new Date(task.due_date!)
        const endDate = task.due_date ? new Date(task.due_date) : startDate

        return {
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          start: startDate,
          end: endDate,
          color: priorityColors[task.priority],
          type: 'task' as const,
          allDay: true,
        }
      })
  }, [tasks])

  const handleEventSelect = (event: CalendarEvent) => {
    const task = tasks.find(t => t.id === event.id)
    if (task) {
      setSelectedTask(task)
      setIsDialogOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des tâches: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={fetchTasks}
          >
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Calendrier des tâches</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{calendarEvents.length} tâches avec dates</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <EventCalendar
            events={calendarEvents}
            onEventSelect={handleEventSelect}
            initialView="month"
          />
        </div>

        {calendarEvents.length === 0 && (
          <Alert>
            <CalendarIcon className="h-4 w-4" />
            <AlertDescription>
              Aucune tâche avec date dans ce projet. Ajoutez des dates de début ou d&apos;échéance à vos tâches pour les voir apparaître dans le calendrier.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Dialog de détail de tâche */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={selectedTask.status === 'done' ? 'default' : 'secondary'}>
                  {statusLabels[selectedTask.status]}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    selectedTask.priority === 'high'
                      ? 'border-rose-500 text-rose-500'
                      : selectedTask.priority === 'medium'
                      ? 'border-amber-500 text-amber-500'
                      : 'border-emerald-500 text-emerald-500'
                  }
                >
                  Priorité {selectedTask.priority === 'high' ? 'haute' : selectedTask.priority === 'medium' ? 'moyenne' : 'basse'}
                </Badge>
              </div>

              {selectedTask.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTask.start_date && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Date de début</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedTask.start_date), 'PPP', { locale: fr })}
                    </p>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Date d&apos;échéance</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedTask.due_date), 'PPP', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>

              {selectedTask.assignees && selectedTask.assignees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigné à</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.assignees.map(assignee => (
                      <Badge key={assignee.id} variant="secondary">
                        {assignee.user.first_name} {assignee.user.last_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Fermer
                </Button>
                <Button onClick={() => {
                  setIsDialogOpen(false)
                  // Ici vous pourriez ouvrir un modal d'édition de tâche
                }}>
                  Modifier la tâche
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
