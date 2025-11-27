'use client'

import { useState, useEffect } from 'react'
import { Clock, Square } from 'lucide-react'
import { useTimeTrackingOptimized } from '../hooks/use-time-tracking-optimized'
import { formatDuration } from '../utils/time-utils'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createClientComponentClient } from '@/lib/supabase'

export function SidebarTimer() {
  const { activeEntry, isTimerRunning, stopTimer } = useTimeTrackingOptimized()
  const { state } = useSidebar()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [taskName, setTaskName] = useState<string>('')
  const supabase = createClientComponentClient()

  const isCollapsed = state === 'collapsed'

  // Update elapsed time every second
  useEffect(() => {
    if (isTimerRunning && activeEntry) {
      // Set initial elapsed time
      const start = new Date(activeEntry.start_time).getTime()
      setElapsedTime(Math.floor((Date.now() - start) / 1000))

      const interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime()
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
    setElapsedTime(0)
  }, [isTimerRunning, activeEntry])

  // Fetch task name when active entry changes
  useEffect(() => {
    if (activeEntry?.task_id) {
      supabase
        .from('tasks')
        .select('title')
        .eq('id', activeEntry.task_id)
        .single()
        .then(({ data }) => setTaskName(data?.title || 'Tâche'))
    } else {
      setTaskName('')
    }
  }, [activeEntry?.task_id, supabase])

  // Collapsed view: just icon with indicator
  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center p-2 mx-auto">
              <Clock className="h-5 w-5" />
              {isTimerRunning && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isTimerRunning ? (
              <div>
                <div className="font-mono font-medium">{formatDuration(elapsedTime)}</div>
                <div className="text-xs text-muted-foreground">{taskName}</div>
              </div>
            ) : (
              <span>Aucun timer actif</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Expanded view
  return (
    <div className="px-2 py-2">
      <div className="rounded-lg border bg-card p-3">
        {isTimerRunning && activeEntry ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <span className="font-mono text-lg font-medium">{formatDuration(elapsedTime)}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{taskName}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={stopTimer}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Arrêter le chronomètre</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Aucun timer actif</span>
          </div>
        )}
      </div>
    </div>
  )
}
