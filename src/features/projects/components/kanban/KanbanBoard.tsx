"use client"

import React, { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Filter, RefreshCw, AlertTriangle } from 'lucide-react'

import { useTasks } from '../../hooks/useTasks'
import { TaskExtended, TaskStatus } from '../../types/kanban'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { TaskFilters } from './TaskFilters'

interface KanbanBoardProps {
  projectId: string
}

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'To-do', status: 'todo' as TaskStatus },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress' as TaskStatus },
  { id: 'review', title: 'Review Ready', status: 'review' as TaskStatus },
  { id: 'done', title: 'Done', status: 'done' as TaskStatus },
] as const

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const {
    tasks,
    loading,
    error,
    updateTask,
    moveTask,
    reorderTasks,
    getTasksByStatus,
    refreshTasks,
  } = useTasks(projectId)

  const [activeTask, setActiveTask] = useState<TaskExtended | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskExtended | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Configuration DnD optimisée sans délai
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distance minimale pour activer le drag
      },
    })
  )

  // Gestion du début de drag
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
      // Vibration tactile pour confirmer le début du drag
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }
  }

  // Gestion de la fin de drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Trouver la tâche déplacée
    const draggedTask = tasks.find(t => t.id === taskId)
    if (!draggedTask) return

    // Cas 1: Déplacement vers une autre colonne
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === overId)
    if (targetColumn && draggedTask.status !== targetColumn.status) {
      try {
        await moveTask(taskId, targetColumn.status)
      } catch (err) {
        console.error('Erreur déplacement tâche:', err)
      }
      return
    }

    // Cas 2: Réorganisation dans la même colonne
    const overTask = tasks.find(t => t.id === overId)
    if (overTask && draggedTask.status === overTask.status) {
      const statusTasks = getTasksByStatus(draggedTask.status)
      const oldIndex = statusTasks.findIndex(t => t.id === taskId)
      const newIndex = statusTasks.findIndex(t => t.id === overId)
      
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        try {
          await reorderTasks(taskId, newIndex, draggedTask.status)
        } catch (err) {
          console.error('Erreur réorganisation tâche:', err)
        }
      }
    }
  }

  // Créer une tâche pour un statut spécifique
  const handleCreateTaskForStatus = (status: TaskStatus) => {
    const newTask: Partial<TaskExtended> = {
      id: '',
      title: '',
      description: '',
      status,
      priority: 'medium',
      project_id: projectId,
      due_date: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
      checklist: [],
      comments: [],
      attachments: [],
      assignees: [],
      timers: [],
      timeLogged: 0,
      checklistProgress: 0,
      isOverdue: false,
      hasActiveTimer: false,
      project: { id: projectId, name: 'Projet' }
    }
    setSelectedTask(newTask as TaskExtended)
    setIsTaskModalOpen(true)
    setIsCreating(true)
  }

  // Éditer une tâche existante
  const handleEditTask = (task: TaskExtended) => {
    setSelectedTask(task)
    setIsTaskModalOpen(true)
    setIsCreating(false)
  }


  // Fermer le modal
  const handleCloseModal = () => {
    setIsTaskModalOpen(false)
    setSelectedTask(null)
    setIsCreating(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {KANBAN_COLUMNS.map((column) => (
            <Card key={column.id} className="bg-muted/50">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-4 items-center">
          <h2 className="text-2xl font-semibold">Tableau Kanban</h2>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtres
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTasks}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <TaskFilters
              filters={{
                search: '',
                priority: undefined,
                assigneeId: undefined,
                tagIds: [],
                hasOverdueTasks: false
              }}
              onFiltersChange={() => {}}
              availableTags={[]}
            />
          </CardContent>
        </Card>
      )}

      {/* Board Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.status}
              title={column.title}
              tasks={getTasksByStatus(column.status)}
              onCreateTask={() => handleCreateTaskForStatus(column.status)}
              onEditTask={handleEditTask}
            />
          ))}
        </div>

        {/* Overlay pour le drag */}
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de tâche */}
      {selectedTask && (
        <TaskModal
          task={isCreating ? undefined : selectedTask}
          isOpen={isTaskModalOpen}
          onClose={handleCloseModal}
          updateTask={updateTask}
          projectId={projectId}
        />
      )}
    </div>
  )
}