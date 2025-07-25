// Types étendus pour la vue Kanban

import { Task, User, TaskTimer, TaskAssignee, Tag } from '@/shared/types/database'

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

// Nouveaux types pour le système enrichi de commentaires et pièces jointes

export interface CommentReaction {
  id: string
  commentId: string
  userId: string
  emoji: string
  createdAt: string
  user?: {
    firstName: string
    lastName: string
  }
}

export interface CommentMention {
  id: string
  commentId: string
  type: 'user' | 'attachment'
  targetId: string // userId ou attachmentId
  startIndex: number
  endIndex: number
}

export interface TaskCommentExtended {
  id: string
  taskId: string
  userId: string
  content: string
  parentCommentId?: string // Pour les réponses
  attachmentId?: string // Référence vers un fichier pour commentaire contextuel
  mentions: CommentMention[]
  reactions: CommentReaction[]
  createdAt: string
  updatedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  replies?: TaskCommentExtended[] // Commentaires enfants
  isEdited?: boolean
}

export interface TaskAttachmentExtended {
  id: string
  taskId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
  comments: TaskCommentExtended[] // Commentaires sur le fichier
  commentsCount: number
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  preview?: {
    thumbnailUrl?: string
    width?: number
    height?: number
  }
}

// Types pour l'éditeur de mentions
export interface MentionSuggestion {
  id: string
  type: 'user' | 'attachment'
  label: string
  sublabel?: string
  avatar?: string
}

export interface MentionMatch {
  type: 'user' | 'attachment'
  trigger: '@'
  query: string
  startIndex: number
  endIndex: number
}

// Types pour les réactions
export interface EmojiReaction {
  emoji: string
  count: number
  users: Array<{
    id: string
    firstName: string
    lastName: string
  }>
  hasUserReacted: boolean
}

// Interface pour les données de l'éditeur de commentaires
export interface CommentEditorData {
  content: string
  mentions: CommentMention[]
  parentCommentId?: string
  attachmentId?: string
}

// Utiliser le type Tag de la base de données directement

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
  comments: TaskCommentExtended[]
  attachments: TaskAttachmentExtended[]
  tags: Tag[]
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

// Statuts de tâches étendus (correspond à la base de données)
export type TaskStatus = 
  | 'todo' 
  | 'in_progress' 
  | 'review' 
  | 'done'

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