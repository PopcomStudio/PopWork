"use client"

import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getBorderRadiusClasses, getEventColorClasses } from "../utils"
import type { CalendarEvent, CalendarView } from "../types"
import { CheckCircle2, Calendar } from "lucide-react"

interface EventItemProps {
  event: CalendarEvent
  view: CalendarView
  onClick?: (e: React.MouseEvent) => void
  isFirstDay?: boolean
  isLastDay?: boolean
  children?: React.ReactNode
}

export function EventItem({
  event,
  view,
  onClick,
  isFirstDay = true,
  isLastDay = true,
  children,
}: EventItemProps) {
  const eventStart = new Date(event.start)
  const borderRadius = getBorderRadiusClasses(isFirstDay, isLastDay)

  return (
    <div
      className={cn(
        "flex h-[var(--event-height)] cursor-pointer items-center overflow-hidden px-1 text-left text-[10px] transition outline-none select-none",
        "mt-[var(--event-gap)]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "shadow-sm backdrop-blur-md",
        getEventColorClasses(event.color),
        borderRadius,
        view === "month" && "sm:px-2 sm:text-xs"
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Event: ${event.title}`}
    >
      {children || (
        <>
          {event.type === "task" ? (
            <CheckCircle2 className="mr-1 h-3 w-3 flex-shrink-0" />
          ) : (
            <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
          )}
          {!event.allDay && view === "month" && (
            <span className="mr-1 font-medium">
              {format(eventStart, "h:mm")}
            </span>
          )}
          <span className="truncate font-medium">{event.title}</span>
        </>
      )}
    </div>
  )
}