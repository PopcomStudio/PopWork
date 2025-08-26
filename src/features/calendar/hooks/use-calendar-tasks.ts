"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@/lib/supabase"
import { CalendarEvent, EventColor } from "../types"

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date: string | null
  project_name: string
  project_id: string
}

export function useCalendarTasks() {
  const [tasks, setTasks] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getPriorityColor = (priority: string): EventColor => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "rose"
      case "high":
        return "orange"
      case "medium":
        return "amber"
      case "low":
        return "sky"
      default:
        return "violet"
    }
  }

  const getStatusColor = (status: string): EventColor => {
    switch (status.toLowerCase()) {
      case "todo":
        return "sky"
      case "in_progress":
        return "amber"
      case "review":
        return "orange"
      case "done":
        return "emerald"
      case "blocked":
        return "rose"
      default:
        return "violet"
    }
  }

  const fetchTasks = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const supabase = createClientComponentClient()

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          projects (
            name,
            id
          )
        `)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })

      if (error) {
        throw error
      }

      const calendarEvents: CalendarEvent[] = (data || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        description: `${task.projects?.name || "Projet"} - ${task.description || ""}`,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        allDay: true,
        color: getStatusColor(task.status),
        location: `Priorité: ${task.priority}`,
        type: "task" as const,
      }))

      setTasks(calendarEvents)
      setError(null)
    } catch (err) {
      console.error("Error fetching tasks:", err)
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    refetchSilently: () => fetchTasks(true)
  }
}