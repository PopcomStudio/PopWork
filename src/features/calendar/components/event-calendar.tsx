"use client"

import { useEffect, useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { useTranslation } from "@/features/translation/contexts/translation-context"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Calendar as CalendarIcon,
} from "lucide-react"
import { toast } from "sonner"

import { CalendarEvent, CalendarView } from "../types"
import { AgendaDaysToShow, EventGap, EventHeight, WeekCellsHeight } from "../constants"
import { MonthView } from "./month-view"
import { CalendarDndProvider } from "./calendar-dnd-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface EventCalendarProps {
  events?: CalendarEvent[]
  onEventCreate?: (startTime: Date) => void
  onEventSelect?: (event: CalendarEvent) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onTaskUpdate?: () => void
  className?: string
  initialView?: CalendarView
}

export function EventCalendar({
  events = [],
  onEventCreate,
  onEventSelect,
  onEventUpdate,
  onTaskUpdate,
  className,
  initialView = "month",
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>(initialView)
  const { language, t } = useTranslation()
  const locale = language === "fr" ? fr : enUS

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month")
          break
        case "w":
          setView("week")
          break
        case "d":
          setView("day")
          break
        case "a":
          setView("agenda")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handlePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1))
    } else if (view === "day") {
      setCurrentDate(addDays(currentDate, -1))
    } else if (view === "agenda") {
      setCurrentDate(addDays(currentDate, -AgendaDaysToShow))
    }
  }

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1))
    } else if (view === "day") {
      setCurrentDate(addDays(currentDate, 1))
    } else if (view === "agenda") {
      setCurrentDate(addDays(currentDate, AgendaDaysToShow))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleEventSelect = (event: CalendarEvent) => {
    onEventSelect?.(event)
  }

  const handleEventCreate = (startTime: Date) => {
    onEventCreate?.(startTime)
  }

  const handleEventUpdate = (event: CalendarEvent) => {
    onEventUpdate?.(event)
  }

  const viewTitle = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy", { locale })
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      if (isSameMonth(start, end)) {
        return format(start, "MMMM yyyy", { locale })
      } else {
        return `${format(start, "MMM", { locale })} - ${format(end, "MMM yyyy", { locale })}`
      }
    } else if (view === "day") {
      return format(currentDate, "EEEE d MMMM yyyy", { locale })
    } else if (view === "agenda") {
      const start = currentDate
      const end = addDays(currentDate, AgendaDaysToShow - 1)
      if (isSameMonth(start, end)) {
        return format(start, "MMMM yyyy", { locale })
      } else {
        return `${format(start, "MMM", { locale })} - ${format(end, "MMM yyyy", { locale })}`
      }
    }
    return format(currentDate, "MMMM yyyy", { locale })
  }, [currentDate, view, locale])

  return (
    <CalendarDndProvider onEventUpdate={handleEventUpdate} onTaskUpdate={onTaskUpdate}>
      <div
        className={cn(
          "flex flex-col rounded-lg border",
          "has-data-[slot=month-view]:flex-1"
        )}
        style={
          {
            "--event-height": `${EventHeight}px`,
            "--event-gap": `${EventGap}px`,
            "--week-cells-height": `${WeekCellsHeight}px`,
          } as React.CSSProperties
        }
      >
      <div className={cn("flex items-center justify-between p-4", className)}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">{viewTitle}</h2>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {view === "month" ? t("calendar.month") : 
                 view === "week" ? t("calendar.week") : 
                 view === "day" ? t("calendar.day") : "Agenda"}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setView("month")}>
                {t("calendar.month")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("week")}>
                {t("calendar.week")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("day")}>
                {t("calendar.day")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("agenda")}>
                Agenda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            onClick={() => handleEventCreate(new Date())}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("calendar.newEvent")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onEventSelect={handleEventSelect}
            onEventCreate={handleEventCreate}
          />
        )}
        {view === "week" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-muted-foreground">Week view coming soon...</p>
          </div>
        )}
        {view === "day" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-muted-foreground">Day view coming soon...</p>
          </div>
        )}
        {view === "agenda" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-muted-foreground">Agenda view coming soon...</p>
          </div>
        )}
      </div>
    </div>
    </CalendarDndProvider>
  )
}