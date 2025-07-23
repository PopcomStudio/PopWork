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
import { IconFilter, IconRefresh, IconPlus, IconAlertTriangle } from '@tabler/icons-react'

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
]

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    moveTask,
    getTasksByStatus,
    refreshTasks,
  } = useTasks(projectId)

  const [activeTask, setActiveTask] = useState<TaskExtended | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskExtended | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Configuration DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Gestion du début de drag
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  // Gestion de la fin de drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Vérifier si on dépose sur une colonne
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === overId)
    if (targetColumn) {
      try {
        await moveTask(taskId, targetColumn.status)
      } catch (err) {
        console.error('Erreur déplacement tâche:', err)
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
      assignee_id: null,
      estimated_hours: 0,
      tracked_time: 0,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
      checklist: [],
      comments: [],
      attachments: [],
      assignees: [],
      assignee: null,
      project: { id: projectId, name: 'Projet' }
    }
    setSelectedTask(newTask as TaskExtended)
    setIsTaskModalOpen(true)
    setIsCreating(true)
  }

  // Sauvegarder une tâche
  const handleSaveTask = async (taskData: Partial<TaskExtended>) => {
    try {
      if (isCreating) {
        await createTask(taskData)
      } else {
        await updateTask(taskData)
      }
      setIsTaskModalOpen(false)
      setSelectedTask(null)
    } catch (err) {
      console.error('Erreur sauvegarde tâche:', err)
    }
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
            <Card key={column.id} className="bg-gray-50">
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
        <IconAlertTriangle className="h-4 w-4" />
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
            <IconFilter className="h-4 w-4 mr-1" />
            Filtres
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTasks}
          >
            <IconRefresh className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => handleCreateTaskForStatus('todo')}
          >
            <IconPlus className="h-4 w-4 mr-1" />
            Nouvelle tâche
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
                assignee: undefined,
                tags: [],
                hasTimer: false,
                overdue: false
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.status}
              title={column.title}
              tasks={getTasksByStatus(column.status)}
              onCreateTask={() => handleCreateTaskForStatus(column.status)}
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
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}