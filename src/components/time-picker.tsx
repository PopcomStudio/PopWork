"use client"

import { Time } from "@internationalized/date"
import { ClockIcon } from "lucide-react"
import { TimeField, DateInput } from "@/components/ui/datefield-rac"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: Time
  onChange: (value: Time) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  return (
    <div className={cn("relative", className)}>
      <TimeField value={value} onChange={onChange} aria-label="Sélectionner l'heure">
        <div className="relative">
          <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 z-10 flex items-center justify-center ps-3">
            <ClockIcon size={16} aria-hidden="true" />
          </div>
          <DateInput className="ps-9" />
        </div>
      </TimeField>
    </div>
  )
}