"use client"

import { useDndContext, useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { EventItem } from "./event-item"
import type { CalendarEvent, CalendarView } from "../types"

interface DraggableEventProps {
  event: CalendarEvent
  view: CalendarView
  onClick?: (e: React.MouseEvent) => void
  isFirstDay?: boolean
  isLastDay?: boolean
  children?: React.ReactNode
}

export function DraggableEvent({
  event,
  view,
  onClick,
  isFirstDay,
  isLastDay,
  children,
}: DraggableEventProps) {
  const dndContext = useDndContext()
  const isDragging = Boolean(dndContext?.active)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isThisEventDragging,
  } = useDraggable({
    id: `event-${event.id}`,
    data: {
      event,
      view,
    },
  })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none",
        isThisEventDragging && "opacity-0 cursor-grabbing z-50",
        !isDragging && !isThisEventDragging && "cursor-grab"
      )}
      onClick={(e) => {
        if (!isDragging && !isThisEventDragging) {
          onClick?.(e)
        }
      }}
    >
      {children ? (
        children
      ) : (
        <EventItem
          event={event}
          view={view}
          isFirstDay={isFirstDay}
          isLastDay={isLastDay}
          onClick={onClick}
        />
      )}
    </div>
  )
}