'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskExtended } from '../../types/kanban'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MessageCircle, Link, Edit, Flag } from 'lucide-react'
import { Check } from 'lucide-react'
import { TaskTimer } from '@/features/time-tracking/components/TaskTimer'

interface TaskCardProps {
  task: TaskExtended
  onEdit?: () => void
}

// Fonction pour convertir hex en couleurs Tailwind
const getTagStyles = (color: string) => {
  // Conversion basique hex vers classes Tailwind (peut être étendue)
  const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
    '#8B5CF6': { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' }, // Violet
    '#3B82F6': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },     // Bleu
    '#10B981': { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },  // Vert
    '#F59E0B': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' }, // Orange
    '#EF4444': { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },       // Rouge
    '#6B7280': { bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500' },     // Gris
    '#DC2626': { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-600' },       // Rouge foncé
    '#059669': { bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-600' }   // Vert foncé
  }
  
  return colorMap[color] || { bg: 'bg-muted/50', text: 'text-muted-foreground', dot: 'bg-muted-foreground' }
}

const priorityBadgeStyles = {
  low: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Faible', icon: 'text-blue-500' },
  medium: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Moyenne', icon: 'text-orange-500' },
  high: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Haute', icon: 'text-red-500' },
  urgent: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Urgente', icon: 'text-red-500' }
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Demain"
    if (diffDays === -1) return "Hier"
    if (diffDays > 0) return `${diffDays} jours restants`
    return `${Math.abs(diffDays)} jours de retard`
  }

  const getAssigneeInitials = (assignee: { firstName?: string; lastName?: string }) => {
    if (assignee && assignee.firstName && assignee.lastName) {
      return assignee.firstName[0] + assignee.lastName[0]
    }
    return 'U'
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Tags (max 2 + compteur)
  const visibleTags = task.tags?.slice(0, 2) || []
  const remainingTagsCount = (task.tags?.length || 0) - 2
  const priorityStyle = priorityBadgeStyles[task.priority]

  // Données réelles depuis la base
  const commentsCount = task.comments?.length || 0
  const attachmentsCount = task.attachments?.length || 0
  const currentProgress = task.checklist?.filter(item => item.completed).length || 0
  const totalProgress = task.checklist?.length || 0

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group p-3 transition-100 border-0 shadow-sm rounded-xl select-none cursor-grab
        hover:outline-1
        ${isDragging ? 'opacity-50 rotate-1 scale-105 cursor-grabbing' : ''}
      `}
    >
      <CardContent className="p-0 space-y-2">
        {/* Priorité et Tags sur la même ligne avec bouton édition */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              className={`
                ${priorityStyle.bg} ${priorityStyle.text} hover:${priorityStyle.bg} 
                px-2 py-1 text-xs font-medium border-0 rounded-full flex items-center gap-1.5
              `}
            >
              <Flag className={`h-3 w-3 ${priorityStyle.icon}`} />
              {priorityStyle.label}
            </Badge>
            
            {visibleTags.map((tag) => {
              const tagStyle = getTagStyles(tag.color)
              return (
                <Badge 
                  key={tag.id}
                  className={`
                    ${tagStyle.bg} ${tagStyle.text} hover:${tagStyle.bg} 
                    px-2 py-1 text-xs font-medium border-0 rounded-full flex items-center gap-1.5
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${tagStyle.dot}`} />
                  {tag.name}
                </Badge>
              )
            })}
            {remainingTagsCount > 0 && (
              <Badge 
                className="bg-gray-50 text-gray-600 hover:bg-gray-50 px-2 py-1 text-xs font-medium border-0 rounded-full"
              >
                +{remainingTagsCount}
              </Badge>
            )}
          </div>
          
          {/* Bouton d'édition aligné en haut à droite */}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/80 shrink-0 mt-0"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEdit()
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Titre */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
            {task.title}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {task.description ? 
              truncateText(task.description, 60) : 
              'Write a 1000-word article discussing the latest adv...'
            }
          </p>
        </div>

        {/* Date et Assignés */}
        <div className="flex items-center justify-between">
          {task.due_date && (
            <div className={`flex items-center gap-1.5 text-sm ${
              task.isOverdue ? 'text-red-600' : 'text-gray-500'
            }`}>
              <Calendar className="h-4 w-4" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          {/* Assignees */}
          <div className="flex -space-x-2">
            {task.assignees?.slice(0, 2).map((assignee) => (
              <Avatar key={assignee.id} className="h-7 w-7 border-2 border-white">
                <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                  {getAssigneeInitials(assignee)}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees && task.assignees.length > 2 && (
              <Avatar className="h-7 w-7 border-2 border-white">
                <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                  +{task.assignees.length - 2}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
        </div>

        {/* Footer avec stats et timer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {commentsCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{commentsCount}</span>
              </div>
            )}
            {attachmentsCount > 0 && (
              <div className="flex items-center gap-1">
                <Link className="h-4 w-4" />
                <span>{attachmentsCount}</span>
              </div>
            )}
            {totalProgress > 0 && (
              <div className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>{currentProgress}/{totalProgress}</span>
              </div>
            )}
          </div>
          
          {/* Timer component */}
          <div onClick={(e) => e.stopPropagation()}>
            <TaskTimer taskId={task.id} compact showTotal />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}