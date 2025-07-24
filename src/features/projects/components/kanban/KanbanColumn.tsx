'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { TaskExtended, TaskStatus } from '../../types/kanban'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { IconPlus, IconDots } from '@tabler/icons-react'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: TaskExtended[]
  title: string
  onCreateTask: () => void
}


export function KanbanColumn({ status, tasks, title, onCreateTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <Card className="h-fit border-none shadow-none bg-gray-50">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          {title}
          <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
            {tasks.length}
          </Badge>
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-background/80"
              onClick={onCreateTask}
            >
              <IconPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-background/80"
            >
              <IconDots className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      
      <CardContent>
        <div
          ref={setNodeRef}
          className={`space-y-4 min-h-96 ${
            isOver ? 'bg-background/60 border-2 border-dashed border-muted-foreground/30 rounded-lg p-2' : ''
          }`}
        >
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
          
          {/* Empty state */}
          {tasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-sm mb-3">No tasks currently. Board is empty</div>
              <Button size="sm" variant="outline" onClick={onCreateTask}>
                Create Task
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}