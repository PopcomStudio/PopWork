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
import { createClientComponentClient } from '@/lib/supabase'

interface ProjectGanttViewProps {
  projectId: string
}

type ViewMode = 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GanttInstance = any

export function ProjectGanttView({ projectId }: ProjectGanttViewProps) {
  const { tasks, loading, error, updateTask, refetch } = useTasks(projectId)
  const ganttRef = useRef<HTMLDivElement>(null)
  const ganttInstanceRef = useRef<GanttInstance>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('Day')
  const [GanttLib, setGanttLib] = useState<GanttInstance>(null)
  const scrollPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const isInteractingRef = useRef(false)
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollSpeedRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const supabase = createClientComponentClient()

  // Charger frappe-gantt dynamiquement côté client
  useEffect(() => {
    // Charger la bibliothèque (le CSS est déjà chargé globalement)
    import('frappe-gantt').then((module) => {
      setGanttLib(() => module.default)
    })
  }, [])

  // Écouter les changements en temps réel sur les tâches
  useEffect(() => {
    const channel = supabase
      .channel(`project-gantt-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Ne recharger que si pas en train d'interagir
          if (!isDraggingRef.current && !isInteractingRef.current) {
            refetch()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase, refetch])

  useEffect(() => {
    if (!ganttRef.current || loading || tasks.length === 0 || !GanttLib) return

    // Ne pas mettre à jour le Gantt pendant les interactions
    if (isDraggingRef.current || isInteractingRef.current) {
      return
    }

    // Sauvegarder la position de scroll actuelle (seulement si pas en train de drag ou d'interaction)
    const ganttContainer = ganttRef.current.querySelector('.gantt-container')
    if (ganttContainer && ganttInstanceRef.current) {
      scrollPositionRef.current = {
        x: ganttContainer.scrollLeft,
        y: ganttContainer.scrollTop,
      }
    }

    // Transformer les tâches au format Frappe Gantt
    const ganttTasks = tasks.map((task: Task) => {
      // Utiliser start_date si disponible, sinon created_at
      const start = task.start_date ? new Date(task.start_date) :
                    task.created_at ? new Date(task.created_at) : new Date()
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

        // Toujours restaurer la position de scroll pour éviter le jump vers aujourd'hui
        // MAIS seulement si pas en train d'interagir
        setTimeout(() => {
          // Double vérification avant de restaurer le scroll
          if (isDraggingRef.current || isInteractingRef.current) {
            return
          }
          if (ganttContainer && scrollPositionRef.current) {
            ganttContainer.scrollLeft = scrollPositionRef.current.x
            ganttContainer.scrollTop = scrollPositionRef.current.y
          }
        }, 50)
      } else {
        ganttInstanceRef.current = new GanttLib(ganttRef.current, ganttTasks, {
          view_mode: viewMode,
          date_format: 'YYYY-MM-DD',
          language: 'fr',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          on_date_change: async (task: any, start: Date, end: Date) => {
            const taskData = tasks.find(t => t.id === task.id)
            if (!taskData) return

            // Marquer le drag en cours
            isDraggingRef.current = true
            isInteractingRef.current = true

            // Mettre à jour l'affichage immédiatement (optimistic update)
            task._start = start
            task._end = end
            task.start = start.toISOString().split('T')[0]
            task.end = end.toISOString().split('T')[0]

            // Annuler le timeout précédent s'il existe
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current)
            }

            // Attendre la fin du drag (300ms sans mouvement) avant de sauvegarder
            dragTimeoutRef.current = setTimeout(async () => {
              const newStartDate = start.toISOString().split('T')[0]
              const newDueDate = end.toISOString().split('T')[0]

              try {
                await updateTask({
                  id: task.id,
                  title: taskData.title,
                  description: taskData.description || undefined,
                  status: taskData.status,
                  priority: taskData.priority,
                  project_id: projectId,
                  start_date: newStartDate,
                  due_date: newDueDate,
                })
              } catch (err) {
                console.error('Erreur lors de la mise à jour de la tâche:', err)
              }
              // Les flags seront désactivés par mouseup, pas ici
            }, 300)
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          on_progress_change: async (task: any, progress: number) => {
            const taskData = tasks.find(t => t.id === task.id)
            if (!taskData) return

            // Marquer le drag en cours
            isDraggingRef.current = true
            isInteractingRef.current = true

            // Déterminer le nouveau statut basé sur le progrès
            let newStatus: 'todo' | 'in_progress' | 'done' = 'todo'
            if (progress === 100) {
              newStatus = 'done'
            } else if (progress > 0) {
              newStatus = 'in_progress'
            }

            // Mettre à jour l'affichage immédiatement (optimistic update)
            task.progress = progress
            task.custom_class = newStatus === 'done' ? 'gantt-task-done' : newStatus === 'in_progress' ? 'gantt-task-in-progress' : 'gantt-task-todo'

            // Annuler le timeout précédent s'il existe
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current)
            }

            // Attendre la fin du drag avant de sauvegarder
            dragTimeoutRef.current = setTimeout(async () => {
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
              // Les flags seront désactivés par mouseup, pas ici
            }, 300)
          },
        })
      }
    } catch (err) {
      console.error('Erreur lors de la création du Gantt:', err)
    }

  }, [tasks, loading, viewMode, projectId, updateTask, GanttLib])

  // UseEffect séparé pour les event listeners (auto-scroll)
  // Ne dépend que de GanttLib pour s'initialiser une fois que le Gantt est chargé
  useEffect(() => {
    if (!ganttRef.current || !GanttLib || !ganttInstanceRef.current) {
      return
    }

    // Ajouter des écouteurs pour détecter les interactions (clics, survols)
    const handleMouseDown = () => {
      isInteractingRef.current = true
    }

    const handleMouseUp = () => {
      // Arrêter l'auto-scroll
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
        autoScrollIntervalRef.current = null
      }
      scrollSpeedRef.current = { x: 0, y: 0 }

      // Désactiver les flags après un court délai pour laisser le temps au dernier save
      setTimeout(() => {
        isDraggingRef.current = false
        isInteractingRef.current = false
      }, 500)
    }

    const handleClick = () => {
      isInteractingRef.current = true
      setTimeout(() => {
        isInteractingRef.current = false
      }, 1000)
    }

    // Auto-scroll quand on drag près des bords
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        // Arrêter l'auto-scroll si on ne drag plus
        if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current)
          autoScrollIntervalRef.current = null
        }
        scrollSpeedRef.current = { x: 0, y: 0 }
        return
      }

      const ganttContainer = ganttRef.current?.querySelector('.gantt-container') as HTMLElement
      if (!ganttContainer) return

      const rect = ganttContainer.getBoundingClientRect()
      const scrollEdgeSize = 50 // Distance du bord pour déclencher le scroll (en pixels)
      const scrollSpeed = 10 // Vitesse de scroll

      // Position de la souris relative au container
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Vérifier si on est près d'un bord
      let scrollX = 0
      let scrollY = 0

      // Bord gauche
      if (mouseX < scrollEdgeSize && mouseX > 0) {
        scrollX = -scrollSpeed
      }
      // Bord droit
      else if (mouseX > rect.width - scrollEdgeSize && mouseX < rect.width) {
        scrollX = scrollSpeed
      }

      // Bord haut
      if (mouseY < scrollEdgeSize && mouseY > 0) {
        scrollY = -scrollSpeed
      }
      // Bord bas
      else if (mouseY > rect.height - scrollEdgeSize && mouseY < rect.height) {
        scrollY = scrollSpeed
      }

      // Mettre à jour la vitesse de scroll
      scrollSpeedRef.current = { x: scrollX, y: scrollY }

      // Si on doit scroller et qu'aucun interval n'est actif, le démarrer
      if ((scrollX !== 0 || scrollY !== 0) && !autoScrollIntervalRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          const container = ganttRef.current?.querySelector('.gantt-container') as HTMLElement
          if (container && scrollSpeedRef.current && (scrollSpeedRef.current.x !== 0 || scrollSpeedRef.current.y !== 0)) {
            container.scrollLeft += scrollSpeedRef.current.x
            container.scrollTop += scrollSpeedRef.current.y
          } else {
            if (autoScrollIntervalRef.current) {
              clearInterval(autoScrollIntervalRef.current)
              autoScrollIntervalRef.current = null
            }
          }
        }, 16) // ~60fps
      }
      // Si on ne doit plus scroller mais qu'un interval est actif, l'arrêter
      else if (scrollX === 0 && scrollY === 0 && autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
        autoScrollIntervalRef.current = null
      }
    }

    // Attacher sur document au lieu de ganttElement pour capturer tous les événements
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)

    return () => {
      // Cleanup des écouteurs
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
    }
  }, [GanttLib, tasks.length]) // Dépend de GanttLib et tasks.length pour s'initialiser après le chargement

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
            <div className="w-4 h-4 rounded bg-orange-200" />
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-300" />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-300" />
            <span>Terminé</span>
          </div>
        </div>
      </Card>

      {/* Styles personnalisés pour le Gantt */}
      <style jsx global>{`
        .gantt-container {
          min-height: 400px;
        }

        /* Définir les couleurs de base pour les barres */
        .gantt-task-done .bar {
          fill: #86efac !important;
        }

        .gantt-task-in-progress .bar {
          fill: #93c5fd !important;
        }

        .gantt-task-todo .bar {
          fill: #fed7aa !important;
        }

        /* Styles pour la barre de progression avec pattern rayé */
        .gantt .bar-progress {
          fill: url(#diagonalStripes) !important;
          opacity: 0.85;
        }

        /* Pattern rayé diagonal pour la partie complétée */
        .gantt-task-done .bar-progress {
          fill: url(#diagonalStripesGreen) !important;
        }

        .gantt-task-in-progress .bar-progress {
          fill: url(#diagonalStripesBlue) !important;
        }

        .gantt-task-todo .bar-progress {
          fill: url(#diagonalStripesOrange) !important;
        }

        /* Améliorer la visibilité du pattern */
        .gantt .bar-wrapper .bar-progress {
          stroke: none;
          opacity: 0.9;
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

      {/* Définir les patterns SVG pour les rayures */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {/* Pattern pour les tâches vertes (terminées) - pastel vert */}
          <pattern id="diagonalStripesGreen" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="#4ade80" />
            <rect x="4" width="4" height="8" fill="#86efac" />
          </pattern>

          {/* Pattern pour les tâches oranges (à faire) - pastel orange */}
          <pattern id="diagonalStripesOrange" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="#fdba74" />
            <rect x="4" width="4" height="8" fill="#fed7aa" />
          </pattern>

          {/* Pattern pour les tâches bleues (en cours) - pastel bleu */}
          <pattern id="diagonalStripesBlue" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="#60a5fa" />
            <rect x="4" width="4" height="8" fill="#93c5fd" />
          </pattern>
        </defs>
      </svg>
    </div>
  )
}
