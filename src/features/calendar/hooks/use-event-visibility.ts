"use client"

import { useCallback, useRef, useState } from "react"

interface UseEventVisibilityOptions {
  eventHeight: number
  eventGap: number
}

export function useEventVisibility({
  eventHeight,
  eventGap,
}: UseEventVisibilityOptions) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [visibleEventCount, setVisibleEventCount] = useState<number | null>(null)

  const getVisibleEventCount = useCallback(
    (totalEvents: number) => {
      if (!contentRef.current || visibleEventCount !== null) {
        return visibleEventCount || totalEvents
      }

      const containerHeight = contentRef.current.offsetHeight
      const eventTotalHeight = eventHeight + eventGap
      const maxVisibleEvents = Math.floor(containerHeight / eventTotalHeight)
      
      const count = Math.min(maxVisibleEvents, totalEvents)
      setVisibleEventCount(count)
      
      return count
    },
    [eventHeight, eventGap, visibleEventCount]
  )

  return { contentRef, getVisibleEventCount }
}