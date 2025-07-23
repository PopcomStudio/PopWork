// Types étendus pour la vue Kanban

import { Task, User, TaskTimer, TaskAssignee } from '@/shared/types/database'

// Nouveaux types pour les fonctionnalités Kanban
export interface TaskChecklist {
  id: string
  taskId: string
  title: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  user?: {
    firstName: string
    lastName: string
  }
}

export interface TaskAttachment {
  id: string
  taskId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
  user?: {
    firstName: string
    lastName: string
  }
}

export interface TaskTag {
  id: string
  name: string
  color: string
  projectId: string
}

export interface TaskTagAssignment {
  id: string
  taskId: string
  tagId: string
}

// Type Task étendu pour la vue Kanban
export interface TaskExtended extends Task {
  // Relations
  assignees: User[]
  checklist: TaskChecklist[]
  comments: TaskComment[]
  attachments: TaskAttachment[]
  tags: TaskTag[]
  timers: TaskTimer[]
  
  // Champs calculés
  timeLogged: number // Total temps en secondes
  checklistProgress: number // Pourcentage 0-100
  isOverdue: boolean
  hasActiveTimer: boolean
  activeTimerUserId?: string
  
  // Relations projet
  project?: {
    id: string
    name: string
  }
}

// Colonnes Kanban configurables
export interface KanbanColumn {
  id: string
  title: string
  status: TaskStatus
  color: string
  order: number
  count: number
}

// Statuts de tâches étendus
export type TaskStatus = 
  | 'todo' 
  | 'in_progress' 
  | 'review' 
  | 'done' 
  | 'blocked'

// Configuration par défaut des colonnes
export const DEFAULT_KANBAN_COLUMNS: Omit<KanbanColumn, 'count'>[] = [
  {
    id: 'todo',
    title: 'À faire',
    status: 'todo',
    color: '#8B5CF6', // violet
    order: 1
  },
  {
    id: 'in_progress',
    title: 'En cours',
    status: 'in_progress',
    color: '#3B82F6', // blue
    order: 2
  },
  {
    id: 'review',
    title: 'En révision',
    status: 'review',
    color: '#F59E0B', // amber
    order: 3
  },
  {
    id: 'done',
    title: 'Terminé',
    status: 'done',
    color: '#10B981', // emerald
    order: 4
  }
]

// Types pour les filtres
export interface TaskFilters {
  assigneeId?: string
  priority?: Task['priority']
  tagIds?: string[]
  dueDateRange?: {
    start: Date
    end: Date
  }
  search?: string
  hasOverdueTasks?: boolean
}

// Types pour les actions de drag & drop
export interface DragEndEvent {
  active: {
    id: string
    data: {
      current: {
        type: 'task'
        task: TaskExtended
      }
    }
  }
  over: {
    id: string
    data: {
      current?: {
        type: 'column'
        column: KanbanColumn
      }
    }
  } | null
}

// Types pour les mutations
export interface CreateTaskData {
  title: string
  description?: string
  priority: Task['priority']
  projectId: string
  status?: TaskStatus
  dueDate?: string
  assigneeIds?: string[]
  tagIds?: string[]
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  id: string
}

export interface CreateChecklistItemData {
  taskId: string
  title: string
  order: number
}

export interface UpdateChecklistItemData {
  id: string
  title?: string
  completed?: boolean
  order?: number
}

export interface CreateCommentData {
  taskId: string
  content: string
  userId: string
}

// Types pour les statistiques
export interface KanbanStats {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  tasksInProgress: number
  averageCompletionTime: number // en jours
  tasksByPriority: {
    high: number
    medium: number
    low: number
  }
  tasksByAssignee: Array<{
    userId: string
    userName: string
    taskCount: number
  }>
}

// Types pour l'historique des actions
export interface TaskActivity {
  id: string
  taskId: string
  userId: string
  action: 'created' | 'updated' | 'assigned' | 'completed' | 'commented' | 'timer_started' | 'timer_stopped'
  changes?: Record<string, { from: any; to: any }>
  createdAt: string
  user: {
    firstName: string
    lastName: string
  }
}