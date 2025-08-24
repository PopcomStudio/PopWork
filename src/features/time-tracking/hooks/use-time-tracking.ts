"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { TimeEntry, TaskTimeSummary, UserTaskTimeSummary } from '@/shared/types/database'
import { useAuth } from '@/features/auth/hooks/use-auth'

interface UseTimeTrackingReturn {
  // Time entries
  timeEntries: TimeEntry[]
  activeEntry: TimeEntry | null
  isTimerRunning: boolean
  
  // Actions
  startTimer: (taskId: string, description?: string) => Promise<void>
  stopTimer: () => Promise<void>
  updateEntry: (entryId: string, updates: Partial<TimeEntry>) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
  
  // Queries
  getTaskTimeEntries: (taskId: string) => Promise<TimeEntry[]>
  getUserTimeEntries: (userId?: string) => Promise<TimeEntry[]>
  getTaskSummary: (taskId: string) => Promise<TaskTimeSummary | null>
  getUserTaskSummary: (taskId: string, userId?: string) => Promise<UserTaskTimeSummary | null>
  
  // State
  loading: boolean
  error: string | null
}

export function useTimeTracking(): UseTimeTrackingReturn {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for active timer on mount
  useEffect(() => {
    if (user) {
      checkActiveTimer()
    }
  }, [user])

  const checkActiveTimer = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)

      if (error) throw error
      if (data && data.length > 0) {
        setActiveEntry(data[0])
      }
    } catch (err) {
      console.error('Error checking active timer:', err)
    }
  }

  const startTimer = async (taskId: string, description?: string) => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Stop any active timer first
      if (activeEntry) {
        await stopTimer()
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: user.id,
          start_time: new Date().toISOString(),
          description
        })
        .select()
        .single()

      if (error) throw error
      
      setActiveEntry(data)
      setTimeEntries(prev => [data, ...prev])
    } catch (err) {
      console.error('Error starting timer:', err)
      setError(err instanceof Error ? err.message : 'Failed to start timer')
    } finally {
      setLoading(false)
    }
  }

  const stopTimer = async () => {
    if (!activeEntry) return

    setLoading(true)
    setError(null)

    try {
      const endTime = new Date()
      const startTime = new Date(activeEntry.start_time)
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration
        })
        .eq('id', activeEntry.id)
        .select()
        .single()

      if (error) throw error

      setActiveEntry(null)
      setTimeEntries(prev => 
        prev.map(entry => entry.id === data.id ? data : entry)
      )
    } catch (err) {
      console.error('Error stopping timer:', err)
      setError(err instanceof Error ? err.message : 'Failed to stop timer')
    } finally {
      setLoading(false)
    }
  }

  const updateEntry = async (entryId: string, updates: Partial<TimeEntry>) => {
    setLoading(true)
    setError(null)

    try {
      // If updating times, recalculate duration
      if (updates.start_time || updates.end_time) {
        const entry = timeEntries.find(e => e.id === entryId)
        if (entry && updates.end_time) {
          const startTime = new Date(updates.start_time || entry.start_time)
          const endTime = new Date(updates.end_time)
          updates.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        }
      }

      const { data, error } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error

      setTimeEntries(prev => 
        prev.map(entry => entry.id === data.id ? data : entry)
      )
    } catch (err) {
      console.error('Error updating entry:', err)
      setError(err instanceof Error ? err.message : 'Failed to update entry')
    } finally {
      setLoading(false)
    }
  }

  const deleteEntry = async (entryId: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error

      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId))
    } catch (err) {
      console.error('Error deleting entry:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    } finally {
      setLoading(false)
    }
  }

  const getTaskTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('start_time', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching task entries:', err)
      return []
    }
  }

  const getUserTimeEntries = async (userId?: string): Promise<TimeEntry[]> => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return []

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', targetUserId)
        .order('start_time', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching user entries:', err)
      return []
    }
  }

  const getTaskSummary = async (taskId: string): Promise<TaskTimeSummary | null> => {
    try {
      const { data, error } = await supabase
        .from('task_time_summary')
        .select('*')
        .eq('task_id', taskId)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching task summary:', err)
      return null
    }
  }

  const getUserTaskSummary = async (taskId: string, userId?: string): Promise<UserTaskTimeSummary | null> => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return null

    try {
      const { data, error } = await supabase
        .from('user_task_time_summary')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', targetUserId)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching user task summary:', err)
      return null
    }
  }

  return {
    timeEntries,
    activeEntry,
    isTimerRunning: !!activeEntry,
    startTimer,
    stopTimer,
    updateEntry,
    deleteEntry,
    getTaskTimeEntries,
    getUserTimeEntries,
    getTaskSummary,
    getUserTaskSummary,
    loading,
    error
  }
}