"use client"

import { useState } from 'react'
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
  Calendar,
  User,
  GripVertical,
} from 'lucide-react'
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
                <Calendar className="h-3 w-3 mr-1" />
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
  })

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
        ref={setNodeRef}
        className={`space-y-3 min-h-64 rounded-lg p-3 transition-all duration-300 ease-in-out border-2 ${
          isOver 
            ? 'bg-primary/5 border-primary/30 border-dashed shadow-lg scale-[1.02] ring-2 ring-primary/20' 
            : 'border-transparent bg-muted/30'
        }`}
      >
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

        {tasks.length === 0 && (
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
        )}
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

  // Configuration des capteurs de drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleCreateTask = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    })
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
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
    // Petit effet de vibration sur mobile si disponible
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Déterminer le nouveau statut basé sur l'ID de la zone de drop
    let newStatus: 'todo' | 'in_progress' | 'done'
    if (overId.includes('todo')) {
      newStatus = 'todo'
    } else if (overId.includes('in_progress')) {
      newStatus = 'in_progress'
    } else if (overId.includes('done')) {
      newStatus = 'done'
    } else {
      // Si on ne reconnaît pas la zone, chercher une tâche dans cette zone
      const targetTask = tasks.find(t => t.id === overId)
      if (targetTask) {
        newStatus = targetTask.status
      } else {
        return
      }
    }

    // Déplacer la tâche si nécessaire
    const currentTask = tasks.find(t => t.id === taskId)
    if (currentTask && currentTask.status !== newStatus) {
      try {
        await updateTaskStatus(taskId, newStatus)
      } catch (error) {
        console.error('Erreur lors du déplacement de la tâche:', error)
      }
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
                        <Calendar className="h-3 w-3 mr-1" />
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

              <div className="space-y-2">
                <Label htmlFor="task-due-date">Date d'échéance</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
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

              <div className="space-y-2">
                <Label htmlFor="edit-task-due-date">Date d'échéance</Label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
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