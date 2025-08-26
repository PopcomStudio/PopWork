"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@/lib/supabase"
import { CalendarEvent, SharedEvent, CreateEventData, UpdateEventData, EventColor } from "../types"
import { toast } from "sonner"

export function useSharedEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const mapEventToCalendarEvent = (event: SharedEvent): CalendarEvent => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start: new Date(event.start_date),
    end: new Date(event.end_date),
    allDay: event.all_day,
    color: event.color as EventColor,
    location: event.location,
    type: "event"
  })

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_shared", true)
        .order("start_date", { ascending: true })

      if (error) throw error

      const calendarEvents = (data || []).map(mapEventToCalendarEvent)
      setEvents(calendarEvents)
    } catch (err) {
      console.error("Error fetching events:", err)
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async (eventData: CreateEventData): Promise<CalendarEvent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Utilisateur non authentifié")
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          ...eventData,
          created_by: user.id,
          is_shared: eventData.is_shared ?? true
        })
        .select()
        .single()

      if (error) throw error

      const newEvent = mapEventToCalendarEvent(data)
      setEvents(prev => [...prev, newEvent])
      
      toast.success(`Événement "${eventData.title}" créé avec succès`)
      return newEvent
    } catch (err) {
      console.error("Error creating event:", err)
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la création"
      toast.error(errorMessage)
      setError(errorMessage)
      return null
    }
  }

  const updateEvent = async (eventData: UpdateEventData): Promise<CalendarEvent | null> => {
    try {
      const { id, ...updateFields } = eventData

      const { data, error } = await supabase
        .from("events")
        .update(updateFields)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      const updatedEvent = mapEventToCalendarEvent(data)
      setEvents(prev => prev.map(event => event.id === id ? updatedEvent : event))
      
      toast.success(`Événement "${data.title}" mis à jour`)
      return updatedEvent
    } catch (err) {
      console.error("Error updating event:", err)
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      toast.error(errorMessage)
      setError(errorMessage)
      return null
    }
  }

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      const eventToDelete = events.find(e => e.id === eventId)

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)

      if (error) throw error

      setEvents(prev => prev.filter(event => event.id !== eventId))
      
      if (eventToDelete) {
        toast.success(`Événement "${eventToDelete.title}" supprimé`)
      }
      return true
    } catch (err) {
      console.error("Error deleting event:", err)
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression"
      toast.error(errorMessage)
      setError(errorMessage)
      return false
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent
  }
}