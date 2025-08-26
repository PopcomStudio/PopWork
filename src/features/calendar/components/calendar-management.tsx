"use client"

import { useState, useMemo } from "react"
import { CalendarEvent, CreateEventData, UpdateEventData } from "../types"
import { EventCalendar } from "./event-calendar"
import { EventDialog } from "./event-dialog"
import { useCalendarTasks } from "../hooks/use-calendar-tasks"
import { useSharedEvents } from "../hooks/use-shared-events"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, CheckCircle2, Clock, Eye, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function CalendarManagement() {
  const { tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks, refetchSilently: refetchTasksSilently } = useCalendarTasks()
  const { 
    events, 
    loading: eventsLoading, 
    error: eventsError, 
    refetch: refetchEvents,
    createEvent,
    updateEvent,
    deleteEvent 
  } = useSharedEvents()

  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)


  const allEvents = useMemo(() => {
    return [...tasks, ...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [tasks, events])

  const loading = tasksLoading || eventsLoading
  const error = tasksError || eventsError

  const handleRefresh = () => {
    refetchTasks()
    refetchEvents()
  }

  const handleTaskRefresh = () => {
    refetchTasksSilently()
  }

  const handleEventAdd = (startTime: Date) => {
    // Ouvrir le dialog de création d'événement
    setSelectedEvent(null)
    setIsEventDialogOpen(true)
  }

  const handleEventSelect = (event: CalendarEvent) => {
    if (event.type === "task") {
      return
    }
    
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const handleEventSave = async (eventData: CreateEventData | UpdateEventData) => {
    if ("id" in eventData) {
      // Mise à jour
      await updateEvent(eventData as UpdateEventData)
    } else {
      // Création
      await createEvent(eventData as CreateEventData)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    await deleteEvent(eventId)
  }

  const handleEventUpdate = async (event: CalendarEvent) => {
    if (event.type === "task") {
      return
    }

    const updateData: UpdateEventData = {
      id: event.id,
      title: event.title,
      description: event.description,
      start_date: event.start.toISOString(),
      end_date: event.end.toISOString(),
      all_day: event.allDay ?? false,
      color: event.color ?? "sky",
      location: event.location,
    }

    await updateEvent(updateData)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground">
            Chargement de vos tâches et échéances...
          </p>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground">
            Une erreur est survenue lors du chargement
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <EventCalendar
        events={allEvents}
        onEventCreate={handleEventAdd}
        onEventSelect={handleEventSelect}
        onEventUpdate={handleEventUpdate}
        onTaskUpdate={handleTaskRefresh}
      />

      <EventDialog
        event={selectedEvent}
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false)
          setSelectedEvent(null)
        }}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  )
}