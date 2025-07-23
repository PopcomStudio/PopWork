'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskExtended } from '../../types/kanban'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { IconClock, IconMessageCircle, IconPlayerPlay, IconCalendar } from '@tabler/icons-react'
import { useTaskTimer } from '../../hooks/useTaskTimer'

interface TaskCardProps {
  task: TaskExtended
}

const priorityBadgeStyles = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200'
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

  const { activeTimer, startTimer, stopTimer } = useTaskTimer(task.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }
    return `${minutes}min`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
  }

  const getAssigneeInitials = (task: TaskExtended) => {
    if (task.assignee) {
      return task.assignee.full_name?.split(' ').map(n => n[0]).join('') || 'U'
    }
    // Fallback avec initiales fictives pour la démo
    const names = ['AB', 'CD', 'EF', 'GH']
    return names[Math.floor(Math.random() * names.length)]
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 rotate-3 scale-105' : ''}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {task.tags?.[0] || 'General'}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${priorityBadgeStyles[task.priority]}`}
              >
                {task.priority}
              </Badge>
            </div>
            <CardTitle className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {task.title}
            </CardTitle>
          </div>
          <Avatar className="h-6 w-6 ml-2">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getAssigneeInitials(task)}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Time info */}
        {(task.due_date || task.estimated_hours) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {task.due_date && (
              <div className="flex items-center gap-1">
                <IconCalendar className="h-3 w-3" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}
            {task.estimated_hours && (
              <div className="flex items-center gap-1">
                <IconClock className="h-3 w-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
          </div>
        )}

        {/* Footer with timer and comments */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-blue-600">
            <IconPlayerPlay className="h-3 w-3" />
            <span className="text-xs font-medium">
              Log: {task.tracked_time > 0 ? formatTime(task.tracked_time) : '0min'}
            </span>
          </div>
          
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconMessageCircle className="h-3 w-3" />
              <span className="text-xs">{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Active Timer Display */}
        {activeTimer && (
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700 font-medium">
                Timer: {formatTime(activeTimer.elapsedSeconds)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-blue-700 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation()
                  stopTimer()
                }}
              >
                Stop
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {!activeTimer && (
        <CardFooter className="pt-3 border-t">
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs text-muted-foreground hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation()
              startTimer(task.id)
            }}
          >
            <IconPlayerPlay className="h-3 w-3 mr-1" />
            Start Timer
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}