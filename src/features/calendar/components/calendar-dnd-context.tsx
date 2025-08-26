"use client"

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
} from "@dnd-kit/core"
import { addDays, differenceInDays } from "date-fns"
import { useState } from "react"
import { toast } from "sonner"
import { createClientComponentClient } from "@/lib/supabase"

import { CalendarEvent, CalendarView } from "../types"
import { EventItem } from "./event-item"

interface CalendarDndProviderProps {
  children: React.ReactNode
  onEventUpdate?: (event: CalendarEvent) => void
  onTaskUpdate?: () => void
}

export function CalendarDndProvider({
  children,
  onEventUpdate,
  onTaskUpdate,
}: CalendarDndProviderProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    const eventData = event.active.data.current?.event as CalendarEvent
    if (eventData) {
      setActiveEvent(eventData)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveEvent(null)

    console.log('🎯 [DEBUG] handleDragEnd started', {
      hasOver: !!over,
      activeId: active.id,
      eventType: active.data.current?.event?.type
    })

    if (!over) {
      console.log('⚠️ [DEBUG] No drop target, returning early')
      return
    }

    const eventData = active.data.current?.event as CalendarEvent
    const view = active.data.current?.view as CalendarView
    const targetDate = over.data.current?.date as Date

    if (!eventData || !targetDate) {
      console.log('⚠️ [DEBUG] Missing eventData or targetDate', {
        hasEventData: !!eventData,
        hasTargetDate: !!targetDate
      })
      return
    }

    console.log('📋 [DEBUG] Event details', {
      eventType: eventData.type,
      eventId: eventData.id,
      eventTitle: eventData.title
    })

    // Handle task drops differently from events
    if (eventData.type === "task") {
      console.log('📋 [DEBUG] Detected task drop, calling handleTaskDrop')
      await handleTaskDrop(eventData, targetDate)
      console.log('📋 [DEBUG] handleTaskDrop completed, returning from handleDragEnd')
      return
    }

    const eventStart = new Date(eventData.start)
    const eventEnd = new Date(eventData.end)
    
    // Normalize dates to start of day for accurate day comparison
    const normalizedEventStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate())
    const normalizedTargetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    
    // Calculate the difference in days between the target and current event start
    const daysDiff = differenceInDays(normalizedTargetDate, normalizedEventStart)
    
    // Only proceed if we're actually moving the event to a different day
    if (daysDiff === 0) return

    // Create new dates by adding the day difference
    const newStart = addDays(eventStart, daysDiff)
    const newEnd = addDays(eventEnd, daysDiff)

    const updatedEvent: CalendarEvent = {
      ...eventData,
      start: newStart,
      end: newEnd,
    }

    // Call the update handler
    onEventUpdate?.(updatedEvent)
    
    // Show success toast
    toast.success("Événement déplacé avec succès", {
      description: `L'événement "${eventData.title}" a été déplacé`,
    })
  }

  const handleTaskDrop = async (taskEvent: CalendarEvent, targetDate: Date) => {
    console.log('🚀 [DEBUG] handleTaskDrop started', {
      taskId: taskEvent.id,
      taskTitle: taskEvent.title,
      targetDate: targetDate.toISOString(),
      onTaskUpdate: !!onTaskUpdate
    })

    try {
      const supabase = createClientComponentClient()
      
      // Format target date correctly to avoid timezone issues
      // Use local date components to create YYYY-MM-DD format
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const day = String(targetDate.getDate()).padStart(2, '0')
      const newDueDate = `${year}-${month}-${day}`
      
      console.log('📅 [DEBUG] Formatted date', { newDueDate })

      const { error } = await supabase
        .from('tasks')
        .update({ 
          due_date: newDueDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskEvent.id)

      if (error) {
        console.log('❌ [DEBUG] Database error', error)
        throw error
      }

      console.log('✅ [DEBUG] Database update successful, calling onTaskUpdate with timeout')

      // Call the task update handler to refresh the calendar
      // Use a timeout to prevent immediate page refresh
      setTimeout(() => {
        console.log('⏰ [DEBUG] Timeout executed, calling onTaskUpdate')
        onTaskUpdate?.()
        console.log('🔄 [DEBUG] onTaskUpdate called')
      }, 100)
      
      console.log('🎉 [DEBUG] Showing success toast')
      
      // Show success toast
      toast.success("Tâche déplacée avec succès", {
        description: `La tâche "${taskEvent.title}" a été reprogrammée`,
      })

      console.log('✨ [DEBUG] handleTaskDrop completed successfully')
    } catch (error) {
      console.error('💥 [DEBUG] Error in handleTaskDrop:', error)
      toast.error("Erreur lors du déplacement de la tâche", {
        description: "Une erreur est survenue lors de la mise à jour de la date d'échéance",
      })
    }
  }

  const handleDragCancel = () => {
    setActiveEvent(null)
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeEvent && (
          <div className="rotate-6 transform opacity-90">
            <div 
              className="relative"
              style={{
                width: `calc(var(--cell-width) * ${Math.max(1, differenceInDays(new Date(activeEvent.end), new Date(activeEvent.start)) + 1)})`,
                minWidth: 'var(--cell-width)',
              }}
            >
              <EventItem
                event={activeEvent}
                view="month"
                isFirstDay={true}
                isLastDay={true}
              />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}