"use client"

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  Flag,
  Calendar as CalendarIcon,
  User,
  GripVertical,
} from 'lucide-react'
import { CalendarDate, getLocalTimeZone, today, parseDate } from "@internationalized/date"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTasks, type Task, type CreateTaskData, type UpdateTaskData } from '../hooks/use-tasks'
import { useRolesPermissions } from '../../auth/hooks/use-roles-permissions'
import { Calendar } from "@/components/ui/calendar-rac"
import { cn } from "@/lib/utils"

interface ProjectKanbanViewProps {
  projectId: string
}

const COLUMNS = [
  {
    id: 'todo' as const,
    title: 'À faire',
  },
  {
    id: 'in_progress' as const,
    title: 'En cours',
  },
  {
    id: 'done' as const,
    title: 'Terminé',
  }
]

// Composant pour les tâches draggables
interface SortableTaskProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

function SortableTask({ task, onEdit, onDelete }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityInfo = getPriorityInfo(task.priority)
  const PriorityIcon = priorityInfo.icon

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-60 scale-105 rotate-2 shadow-xl shadow-primary/20 z-50' : 'hover:scale-[1.02]'
      }`}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <h5 className="font-medium text-sm leading-tight line-clamp-2 flex-1 pointer-events-none">
            {task.title}
          </h5>
          <div className="flex items-center gap-1 ml-2">
            {/* Indicateur de drag visible */}
            <div className="cursor-grab active:cursor-grabbing p-1 rounded opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
            {/* Bouton de suppression */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 pointer-events-auto"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            {/* Bouton d'édition */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(task)
              }}
              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 pointer-events-auto"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Métadonnées */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Priorité */}
            <Badge variant="outline" className={`text-xs ${priorityInfo.color}`}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityInfo.label}
            </Badge>
            
            {/* Date d'échéance */}
            {task.due_date && (
              <Badge variant="outline" className="text-xs">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {new Date(task.due_date).toLocaleDateString('fr-FR')}
              </Badge>
            )}
          </div>

          {/* Assignés */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map(assignee => {
                const initials = `${assignee.user.first_name.charAt(0)}${assignee.user.last_name.charAt(0)}`.toUpperCase()
                return (
                  <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )
              })}
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{task.assignees.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Composant pour les colonnes droppables
interface DroppableColumnProps {
  column: typeof COLUMNS[0]
  tasks: Task[]
  onCreateTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

function DroppableColumn({ column, tasks, onCreateTask, onEditTask, onDeleteTask }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      columnId: column.id,
    },
  })

  console.log(`📍 [COLUMN ${column.id}] isOver:`, isOver, 'tasks count:', tasks.length)

  return (
    <div className="space-y-4">
      {/* En-tête de colonne avec styles ShadCN standards */}
      <Card className="border-dashed transition-all duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">
              {column.title}
            </h4>
            <Badge variant="secondary" className="transition-all duration-200">
              {tasks.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateTask}
            className="w-full justify-start text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-accent/50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une tâche
          </Button>
        </CardHeader>
      </Card>

      {/* Zone de drop pour les tâches avec animations */}
      <div
        className="flex flex-col rounded-lg min-h-64"
      >
        {/* Liste des tâches sortables */}
        <div className="flex-1 space-y-3 p-3">
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="animate-in fade-in-0 slide-in-from-top-2"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationDuration: '300ms',
                }}
              >
                <SortableTask
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              </div>
            ))}
          </SortableContext>
        </div>

        {/* Zone de drop visible en bas de la colonne */}
        <div
          ref={setNodeRef}
          className={`mx-3 mb-3 rounded-lg p-4 transition-all duration-300 ease-in-out border-2 ${
            isOver
              ? 'bg-primary/10 border-primary border-dashed shadow-lg ring-2 ring-primary/20 min-h-20'
              : 'border-transparent bg-muted/20 min-h-12'
          } ${tasks.length === 0 ? 'min-h-52' : ''}`}
        >
          {tasks.length === 0 ? (
            <div className={`text-center py-12 text-muted-foreground transition-all duration-300 ${
              isOver ? 'animate-pulse' : ''
            }`}>
              <div className={`inline-flex flex-col items-center gap-2 ${
                isOver ? 'scale-110' : ''
              }`}>
                {isOver ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-primary">Déposez la tâche ici</p>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </div>
                    <p className="text-sm">Aucune tâche</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className={`flex items-center justify-center text-sm transition-all duration-300 ${
              isOver ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}>
              {isOver ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Déposer ici
                </>
              ) : (
                <span className="text-xs opacity-50">Zone de drop</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getPriorityInfo(priority: string) {
  switch (priority) {
    case 'high':
      return {
        label: 'Haute',
        icon: AlertTriangle,
        color: 'text-red-600 bg-red-50 border-red-200',
      }
    case 'medium':
      return {
        label: 'Moyenne',
        icon: Flag,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
      }
    case 'low':
      return {
        label: 'Basse',
        icon: Flag,
        color: 'text-green-600 bg-green-50 border-green-200',
      }
    default:
      return {
        label: 'Moyenne',
        icon: Flag,
        color: 'text-gray-600 bg-gray-50 border-gray-200',
      }
  }
}

export function ProjectKanbanView({ projectId }: ProjectKanbanViewProps) {
  const { tasks, loading, error, createTask, updateTask, updateTaskStatus, deleteTask } = useTasks(projectId)
  const { fetchAllUsers } = useRolesPermissions()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskColumnId, setNewTaskColumnId] = useState<'todo' | 'in_progress' | 'done'>('todo')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  // États pour le formulaire de création/édition
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  })
  const [taskLoading, setTaskLoading] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const editCalendarRef = useRef<HTMLDivElement>(null)

  // Configuration des capteurs de drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fermer le calendrier quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
      if (editCalendarRef.current && !editCalendarRef.current.contains(event.target as Node)) {
        setIsEditCalendarOpen(false)
      }
    }

    if (isCalendarOpen || isEditCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCalendarOpen, isEditCalendarOpen])

  const handleCreateTask = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    })
    setIsCalendarOpen(false)
    setIsCreateDialogOpen(true)
  }

  const handleCreateTaskForColumn = (columnId: 'todo' | 'in_progress' | 'done') => {
    setNewTaskColumnId(columnId)
    handleCreateTask()
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || '',
    })
    setIsEditCalendarOpen(false)
    setIsEditDialogOpen(true)
  }

  const handleSaveNewTask = async () => {
    if (!taskForm.title.trim()) return

    try {
      setTaskLoading(true)
      
      const taskData: CreateTaskData = {
        title: taskForm.title,
        description: taskForm.description,
        status: newTaskColumnId,
        priority: taskForm.priority,
        project_id: projectId,
        due_date: taskForm.due_date || undefined,
      }

      await createTask(taskData)
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error)
    } finally {
      setTaskLoading(false)
    }
  }

  const handleSaveEditTask = async () => {
    if (!editingTask || !taskForm.title.trim()) return

    try {
      setTaskLoading(true)
      
      const taskData: UpdateTaskData = {
        id: editingTask.id,
        title: taskForm.title,
        description: taskForm.description,
        status: editingTask.status,
        priority: taskForm.priority,
        project_id: projectId,
        due_date: taskForm.due_date || undefined,
      }

      await updateTask(taskData)
      setIsEditDialogOpen(false)
      setEditingTask(null)
    } catch (error) {
      console.error('Erreur lors de la modification de la tâche:', error)
    } finally {
      setTaskLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      try {
        await deleteTask(taskId)
      } catch (error) {
        console.error('Erreur lors de la suppression de la tâche:', error)
      }
    }
  }

  // Gestion des événements de drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎬 [DRAG START] Task ID:', event.active.id)
    const task = tasks.find(t => t.id === event.active.id)
    console.log('🎬 [DRAG START] Task found:', task ? { id: task.id, title: task.title, status: task.status } : 'NOT FOUND')
    setActiveTask(task || null)
    // Petit effet de vibration sur mobile si disponible
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    console.log('🎯 [DRAG END] Event:', {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data?.current
    })

    if (!over) {
      console.log('❌ [DRAG END] No over target')
      return
    }

    const taskId = active.id as string

    // Déterminer le nouveau statut en utilisant les données de la zone de drop
    let newStatus: 'todo' | 'in_progress' | 'done'

    // Vérifier le type de la zone de drop grâce aux données
    const overData = over.data.current as any

    console.log('📊 [DRAG END] Over data type:', overData?.type)

    if (overData?.type === 'column') {
      // On a droppé sur une colonne
      newStatus = overData.columnId
      console.log('✅ [DRAG END] Dropped on column:', newStatus)
    } else if (overData?.type === 'task') {
      // On a droppé sur une autre tâche - prendre le statut de cette tâche
      newStatus = overData.task.status
      console.log('✅ [DRAG END] Dropped on task, status:', newStatus)
    } else {
      // Fallback: essayer de déterminer depuis l'ID
      const overId = over.id as string
      if (overId.startsWith('column-')) {
        const columnId = overId.replace('column-', '') as typeof newStatus
        newStatus = columnId
        console.log('✅ [DRAG END] Status from column ID fallback:', newStatus)
      } else {
        console.log('❌ [DRAG END] Cannot determine target status')
        return
      }
    }

    // Déplacer la tâche si nécessaire
    const currentTask = tasks.find(t => t.id === taskId)
    console.log('📋 [DRAG END] Current task:', {
      id: currentTask?.id,
      currentStatus: currentTask?.status,
      newStatus
    })

    if (currentTask && currentTask.status !== newStatus) {
      console.log('🚀 [DRAG END] Updating task status...')
      try {
        await updateTaskStatus(taskId, newStatus)
        console.log('✅ [DRAG END] Task status updated successfully')
      } catch (error) {
        console.error('❌ [DRAG END] Error updating task:', error)
      }
    } else {
      console.log('⏭️ [DRAG END] No status change needed')
    }
  }

  // Grouper les tâches par statut
  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    done: tasks.filter(task => task.status === 'done'),
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map(column => (
          <div key={column.id} className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Erreur lors du chargement des tâches</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Tâches du projet</h3>
          <Badge variant="secondary">
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <Button onClick={handleCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle tâche
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map(column => (
          <div key={column.id} id={`column-${column.id}`}>
            <DroppableColumn
              column={column}
              tasks={tasksByStatus[column.id]}
              onCreateTask={() => handleCreateTaskForColumn(column.id)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        ))}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 300,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeTask ? (
          <div className="transform rotate-3 scale-105 opacity-95 shadow-2xl shadow-primary/25">
            <Card className="border-2 border-primary/30 bg-card backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
                    {activeTask.title}
                  </h5>
                  <div className="flex items-center gap-1 ml-2">
                    <div className="p-1 rounded opacity-75">
                      <GripVertical className="h-3 w-3 text-primary" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {activeTask.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {activeTask.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${getPriorityInfo(activeTask.priority).color}`}>
                      <Flag className="h-3 w-3 mr-1" />
                      {getPriorityInfo(activeTask.priority).label}
                    </Badge>
                    {activeTask.due_date && (
                      <Badge variant="outline" className="text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {new Date(activeTask.due_date).toLocaleDateString('fr-FR')}
                      </Badge>
                    )}
                  </div>
                  {activeTask.assignees && activeTask.assignees.length > 0 && (
                    <div className="flex -space-x-1">
                      {activeTask.assignees.slice(0, 3).map(assignee => {
                        const initials = `${assignee.user.first_name.charAt(0)}${assignee.user.last_name.charAt(0)}`.toUpperCase()
                        return (
                          <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DragOverlay>

      {/* Dialog de création de tâche */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Titre de la tâche</Label>
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de la tâche"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la tâche (optionnel)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priorité</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="task-due-date">Date d'échéance</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                    !taskForm.due_date && "text-muted-foreground"
                  )}
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                  <span className="truncate">
                    {taskForm.due_date
                      ? format(new Date(taskForm.due_date), "d MMM yyyy", { locale: fr })
                      : "Choisir une date"
                    }
                  </span>
                  <CalendarIcon
                    size={16}
                    className="text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </Button>

                {isCalendarOpen && (
                  <div
                    ref={calendarRef}
                    className="absolute top-full left-0 mt-1 z-[9999] bg-background border rounded-md shadow-lg"
                  >
                    <Calendar
                      className="rounded-md p-2"
                      value={taskForm.due_date ? parseDate(taskForm.due_date) : null}
                      onChange={(date) => {
                        if (date) {
                          const dateString = format(date.toDate(getLocalTimeZone()), "yyyy-MM-dd")
                          setTaskForm(prev => ({ ...prev, due_date: dateString }))
                          setIsCalendarOpen(false)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={taskLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveNewTask}
                disabled={taskLoading || !taskForm.title.trim()}
              >
                {taskLoading ? 'Création...' : 'Créer la tâche'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition de tâche */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Titre de la tâche</Label>
              <Input
                id="edit-task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de la tâche"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la tâche (optionnel)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-task-priority">Priorité</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="edit-task-due-date">Date d'échéance</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                    !taskForm.due_date && "text-muted-foreground"
                  )}
                  onClick={() => setIsEditCalendarOpen(!isEditCalendarOpen)}
                >
                  <span className="truncate">
                    {taskForm.due_date
                      ? format(new Date(taskForm.due_date), "d MMM yyyy", { locale: fr })
                      : "Choisir une date"
                    }
                  </span>
                  <CalendarIcon
                    size={16}
                    className="text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </Button>

                {isEditCalendarOpen && (
                  <div
                    ref={editCalendarRef}
                    className="absolute top-full left-0 mt-1 z-[9999] bg-background border rounded-md shadow-lg"
                  >
                    <Calendar
                      className="rounded-md p-2"
                      value={taskForm.due_date ? parseDate(taskForm.due_date) : null}
                      onChange={(date) => {
                        if (date) {
                          const dateString = format(date.toDate(getLocalTimeZone()), "yyyy-MM-dd")
                          setTaskForm(prev => ({ ...prev, due_date: dateString }))
                          setIsEditCalendarOpen(false)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingTask(null)
                }}
                disabled={taskLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveEditTask}
                disabled={taskLoading || !taskForm.title.trim()}
              >
                {taskLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  )
} 