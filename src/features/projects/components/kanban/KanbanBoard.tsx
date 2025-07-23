"use client"

import React, { useState, useMemo } from 'react'
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
import { 
  SortableContext, 
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconPlus,
  IconFilter,
  IconSearch,
  IconRefresh,
  IconListCheck,
  IconClock,
  IconAlertTriangle
} from '@tabler/icons-react'

import { useTasks } from '../../hooks/useTasks'
import { useTaskTimer } from '../../hooks/useTaskTimer'
import { 
  TaskExtended, 
  TaskStatus, 
  DEFAULT_KANBAN_COLUMNS,
  KanbanColumn,
  TaskFilters 
} from '../../types/kanban'

import { KanbanColumn as KanbanColumnComponent } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { TaskFilters as TaskFiltersComponent } from './TaskFilters'

interface KanbanBoardProps {
  projectId: string
  className?: string
}

export function KanbanBoard({ projectId, className }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskExtended | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskExtended | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const {
    tasks,
    loading,
    error,
    stats,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    assignUser,
    unassignUser,
    applyFilters,
    clearFilters,
    refreshTasks,
    getTasksByStatus
  } = useTasks(projectId)

  const { activeTimer } = useTaskTimer()

  // Configuration des sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Créer les colonnes avec les compteurs
  const columns: KanbanColumn[] = useMemo(() => {
    return DEFAULT_KANBAN_COLUMNS.map(col => ({
      ...col,
      count: getTasksByStatus(col.status).length
    }))
  }, [tasks, getTasksByStatus])

  // IDs des colonnes pour SortableContext
  const columnIds = columns.map(col => col.id)

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
    const targetColumn = columns.find(col => col.id === overId)
    if (targetColumn) {
      try {
        await moveTask(taskId, targetColumn.status)
      } catch (err) {
        console.error('Erreur déplacement tâche:', err)
      }
    }
  }

  // Ouvrir le modal de création de tâche
  const handleCreateTask = (status?: TaskStatus) => {
    const newTask: Partial<TaskExtended> = {
      status: status || 'todo',
      priority: 'medium',
      projectId
    }
    setSelectedTask(newTask as TaskExtended)
    setIsTaskModalOpen(true)
    setIsCreating(true)
  }

  // Ouvrir le modal d'édition de tâche
  const handleEditTask = (task: TaskExtended) => {
    setSelectedTask(task)
    setIsTaskModalOpen(true)
    setIsCreating(false)
  }

  // Fermer le modal
  const handleCloseModal = () => {
    setSelectedTask(null)
    setIsTaskModalOpen(false)
    setIsCreating(false)
  }

  // Sauvegarder une tâche
  const handleSaveTask = async (taskData: any) => {
    try {
      if (isCreating) {
        await createTask(taskData)
      } else {
        await updateTask({ ...taskData, id: selectedTask!.id })
      }
      handleCloseModal()
    } catch (err) {
      console.error('Erreur sauvegarde tâche:', err)
    }
  }

  // Supprimer une tâche
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      handleCloseModal()
    } catch (err) {
      console.error('Erreur suppression tâche:', err)
    }
  }

  // Appliquer des filtres
  const handleApplyFilters = (filters: TaskFilters) => {
    applyFilters(filters)
    setShowFilters(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-96">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
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
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec statistiques et actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-4 items-center">
          <h2 className="text-2xl font-semibold">Tableau Kanban</h2>
          {stats && (
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <IconListCheck className="h-3 w-3" />
                {stats.completedTasks}/{stats.totalTasks} terminées
              </Badge>
              {stats.overdueTasks > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <IconAlertTriangle className="h-3 w-3" />
                  {stats.overdueTasks} en retard
                </Badge>
              )}
              {activeTimer && (
                <Badge variant="secondary" className="gap-1">
                  <IconClock className="h-3 w-3" />
                  Timer actif
                </Badge>
              )}
            </div>
          )}
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
            onClick={() => handleCreateTask()}
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
            <TaskFiltersComponent
              onApplyFilters={handleApplyFilters}
              onClearFilters={clearFilters}
              projectId={projectId}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[600px]">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.status)}
                onCreateTask={() => handleCreateTask(column.status)}
                onEditTask={handleEditTask}
              />
            ))}
          </SortableContext>
        </div>

        {/* Overlay pour le drag */}
        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de tâche */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          isCreating={isCreating}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          projectId={projectId}
        />
      )}
    </div>
  )
}