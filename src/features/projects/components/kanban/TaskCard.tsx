'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskExtended } from '../../types/kanban'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { IconCalendar, IconMessageCircle, IconLink, IconDots, IconFiles } from '@tabler/icons-react'
import { Check } from 'lucide-react'

interface TaskCardProps {
  task: TaskExtended
}

// Fonction pour convertir hex en couleurs Tailwind
const getTagStyles = (color: string) => {
  // Conversion basique hex vers classes Tailwind (peut être étendue)
  const colorMap: Record<string, any> = {
    '#8B5CF6': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' }, // Violet
    '#3B82F6': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },     // Bleu
    '#10B981': { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },  // Vert
    '#F59E0B': { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' }, // Orange
    '#EF4444': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },       // Rouge
    '#6B7280': { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-500' },     // Gris
    '#DC2626': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },       // Rouge foncé
    '#059669': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-600' }   // Vert foncé
  }
  
  return colorMap[color] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-500' }
}

const priorityBadgeStyles = {
  low: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Low' },
  medium: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'Medium' },
  high: { bg: 'bg-red-50', text: 'text-red-600', label: 'High' },
  urgent: { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgent' }
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getAssigneeInitials = (assignees: any[]) => {
    if (assignees && assignees.length > 0) {
      return assignees[0].firstName?.[0] + assignees[0].lastName?.[0] || 'U'
    }
    // Initiales factices pour la démo
    const names = ['JD', 'AM', 'LK', 'MT']
    return names[Math.floor(Math.random() * names.length)]
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Utiliser le premier tag de la tâche ou un tag par défaut
  const primaryTag = task.tags && task.tags.length > 0 ? task.tags[0] : null
  const tagStyle = primaryTag ? getTagStyles(primaryTag.color) : { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-500' }
  const priorityStyle = priorityBadgeStyles[task.priority]

  // Données factices pour correspondre au design
  const commentsCount = Math.floor(Math.random() * 8) + 1
  const linksCount = Math.floor(Math.random() * 3)
  const currentProgress = Math.floor(Math.random() * 3) + 1
  const totalProgress = 3

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-3 hover:outline-1 transition-all cursor-grab active:cursor-grabbing border-0 shadow-sm rounded-xl
        ${isDragging ? 'opacity-50 rotate-1 scale-105' : ''}
      `}
    >
      <CardContent className="p-0 space-y-2">
        {/* Header avec tag badge et menu */}
        <div className="flex items-center gap-1.5">
          <Badge 
            className={`
              ${tagStyle.bg} ${tagStyle.text} hover:${tagStyle.bg} 
              px-2 py-1 text-xs font-medium border-0 rounded-full flex items-center gap-1.5
            `}
          >
            <div className={`w-2 h-2 rounded-full ${tagStyle.dot}`} />
            {primaryTag ? primaryTag.name : 'General'}
          </Badge>
          <Badge 
            className={`
              ${priorityStyle.bg} ${priorityStyle.text} hover:${priorityStyle.bg} 
              px-3 py-1 text-xs font-medium border-0 rounded-full
            `}
          >
            {priorityStyle.label}
          </Badge>
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

        {/* Date et Priorité */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <IconCalendar className="h-4 w-4" />
            <span>
              {task.due_date ? 
                formatDate(task.due_date) : 
                '25 Mar 2023'
              }
            </span>
          </div>
          {/* Assignees */}
          <div className="flex -space-x-2">
            {[1, 2].map((_, index) => (
              <Avatar key={index} className="h-7 w-7 border-2 border-white">
                <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                  {getAssigneeInitials(task.assignees)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          
        </div>

        {/* Footer avec stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <IconMessageCircle className="h-4 w-4" />
              <span>{commentsCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <IconLink className="h-4 w-4" />
              <span>{linksCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Check className="h-4 w-4" />
            <span>{currentProgress}/{totalProgress}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}