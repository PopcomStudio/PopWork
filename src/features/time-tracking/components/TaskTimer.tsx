'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Clock, Users } from 'lucide-react'
import { useTimeTrackingOptimized } from '../hooks/use-time-tracking-optimized'
import { formatDuration } from '../utils/time-utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TaskTimerProps {
  taskId: string
  compact?: boolean
  showTotal?: boolean
}

export function TaskTimer({ taskId, compact = false, showTotal = true }: TaskTimerProps) {
  const { activeEntry, isTimerRunning, startTimer, stopTimer, getTaskSummary } = useTimeTrackingOptimized()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [contributors, setContributors] = useState(0)

  const isActiveForThisTask = activeEntry?.task_id === taskId

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (isActiveForThisTask && isTimerRunning && activeEntry) {
      // Set initial elapsed time
      const startTime = new Date(activeEntry.start_time).getTime()
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))

      const interval = setInterval(() => {
        const start = new Date(activeEntry.start_time).getTime()
        setElapsedTime(Math.floor((Date.now() - start) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setElapsedTime(0)
    }
  }, [isActiveForThisTask, isTimerRunning, activeEntry])

  // Fetch total time for the task (team total from all contributors)
  useEffect(() => {
    const fetchTotalTime = async () => {
      const summary = await getTaskSummary(taskId)
      if (summary) {
        setTotalTime(summary.total_duration || 0)
        setContributors(summary.unique_contributors || 0)
      }
    }

    fetchTotalTime()
    // Refetch when timer stops
    if (!isTimerRunning) {
      fetchTotalTime()
    }
  }, [taskId, isTimerRunning, getTaskSummary])

  const handleToggleTimer = async () => {
    if (isActiveForThisTask) {
      await stopTimer()
    } else {
      await startTimer(taskId)
    }
  }

  const displayTotal = totalTime + elapsedTime

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isActiveForThisTask ? "secondary" : "ghost"}
                className={`h-7 px-2 ${isActiveForThisTask ? 'bg-green-500/10 hover:bg-green-500/20 text-green-600' : ''}`}
                onClick={handleToggleTimer}
              >
                {isActiveForThisTask ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    <span className="text-xs font-mono">
                      {formatDuration(elapsedTime)}
                    </span>
                  </>
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isActiveForThisTask ? "Arrêter le chronomètre" : "Démarrer le chronomètre"}
            </TooltipContent>
          </Tooltip>

          {showTotal && displayTotal > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {contributors > 1 ? (
                    <Users className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  <span className="font-mono">{formatDuration(displayTotal)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {contributors > 1 ? (
                  <div>
                    <div>Temps total équipe</div>
                    <div className="text-xs text-muted-foreground">{contributors} contributeurs</div>
                  </div>
                ) : (
                  <span>Temps total</span>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="flex-1">
        <div className="text-sm font-medium mb-1">Chronomètre</div>
        <div className="flex items-center gap-4">
          <div className={`text-2xl font-mono ${isActiveForThisTask ? 'text-green-600' : ''}`}>
            {isActiveForThisTask
              ? formatDuration(elapsedTime)
              : '00:00:00'
            }
          </div>
          {showTotal && displayTotal > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {contributors > 1 ? (
                <>
                  <Users className="h-4 w-4" />
                  <span>Équipe: {formatDuration(displayTotal)}</span>
                  <span className="text-xs">({contributors})</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Total: {formatDuration(displayTotal)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {isActiveForThisTask ? (
          <Button
            size="sm"
            variant="secondary"
            className="bg-green-500/10 hover:bg-green-500/20 text-green-600"
            onClick={stopTimer}
          >
            <Square className="h-4 w-4 mr-2" />
            Arrêter
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => startTimer(taskId)}
          >
            <Play className="h-4 w-4 mr-2" />
            Démarrer
          </Button>
        )}
      </div>
    </div>
  )
}
