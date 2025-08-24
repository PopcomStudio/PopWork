'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Clock } from 'lucide-react'
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
  
  const isActiveForThisTask = activeEntry?.task_id === taskId

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (isActiveForThisTask && isTimerRunning) {
      const interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setElapsedTime(0)
    }
  }, [isActiveForThisTask, isTimerRunning, activeEntry])

  // Fetch total time for the task
  useEffect(() => {
    const fetchTotalTime = async () => {
      const summary = await getTaskSummary(taskId)
      if (summary) {
        setTotalTime(summary.total_duration || 0)
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

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isActiveForThisTask ? "secondary" : "ghost"}
                className="h-7 px-2"
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
          
          {showTotal && totalTime > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(totalTime + elapsedTime)}
                </div>
              </TooltipTrigger>
              <TooltipContent>Temps total enregistré</TooltipContent>
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
          <div className="text-2xl font-mono">
            {isActiveForThisTask 
              ? formatDuration(elapsedTime)
              : '00:00:00'
            }
          </div>
          {showTotal && (
            <div className="text-sm text-muted-foreground">
              Total: {formatDuration(totalTime + elapsedTime)}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        {isActiveForThisTask ? (
          <Button
            size="sm"
            variant="secondary"
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