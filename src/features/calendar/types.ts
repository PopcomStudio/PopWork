export type CalendarView = "month" | "week" | "day" | "agenda"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  color?: EventColor
  location?: string
  type?: "task" | "event" // Nouveau: pour distinguer les tâches des événements
}

export interface SharedEvent {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  all_day: boolean
  color: string
  location?: string
  is_shared: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateEventData {
  title: string
  description?: string
  start_date: string
  end_date: string
  all_day: boolean
  color: string
  location?: string
  is_shared?: boolean
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string
}

export type EventColor =
  | "sky"
  | "amber"
  | "violet" 
  | "rose"
  | "emerald"
  | "orange"