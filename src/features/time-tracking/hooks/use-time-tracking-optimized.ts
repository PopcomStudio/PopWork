"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { TimeEntry, TaskTimeSummary, UserTaskTimeSummary } from '@/shared/types/database'
import { useAuth } from '@/features/auth/hooks/use-auth'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
const BATCH_UPDATE_DELAY = 1000 // 1 second delay for batching

interface CachedData<T> {
  data: T
  timestamp: number
}

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

export function useTimeTrackingOptimized(): UseTimeTrackingReturn {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache references
  const cacheRef = useRef<Map<string, CachedData<any>>>(new Map())
  const batchUpdateQueueRef = useRef<Map<string, Partial<TimeEntry>>>(new Map())
  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Local storage key for offline support
  const LOCAL_STORAGE_KEY = 'time_tracking_pending'

  // Helper: Check if cache is valid
  const isCacheValid = (key: string): boolean => {
    const cached = cacheRef.current.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < CACHE_DURATION
  }

  // Helper: Get from cache
  const getFromCache = <T,>(key: string): T | null => {
    if (isCacheValid(key)) {
      return cacheRef.current.get(key)?.data || null
    }
    return null
  }

  // Helper: Set cache
  const setCache = <T,>(key: string, data: T) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Helper: Save pending updates to local storage
  const savePendingUpdates = () => {
    const pending = Array.from(batchUpdateQueueRef.current.entries())
    if (pending.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pending))
    }
  }

  // Helper: Load and apply pending updates
  const loadPendingUpdates = async () => {
    const pendingStr = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (pendingStr) {
      try {
        const pending = JSON.parse(pendingStr)
        for (const [entryId, updates] of pending) {
          await applyUpdate(entryId, updates)
        }
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      } catch (err) {
        console.error('Error applying pending updates:', err)
      }
    }
  }

  // Check for active timer on mount (optimized with single query)
  useEffect(() => {
    if (user) {
      checkActiveTimer()
      loadPendingUpdates()
    }
  }, [user])

  const checkActiveTimer = async () => {
    if (!user) return

    // Check cache first
    const cacheKey = `active_timer_${user.id}`
    const cached = getFromCache<TimeEntry>(cacheKey)
    if (cached) {
      setActiveEntry(cached)
      return
    }

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setActiveEntry(data)
        setCache(cacheKey, data)
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
      // Stop any active timer first (optimistic update)
      if (activeEntry) {
        await stopTimer()
      }

      // Optimistic update
      const tempEntry: TimeEntry = {
        id: `temp_${Date.now()}`,
        task_id: taskId,
        user_id: user.id,
        start_time: new Date().toISOString(),
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setActiveEntry(tempEntry)
      setTimeEntries(prev => [tempEntry, ...prev])

      // Actual database insert
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
      
      // Replace temp entry with real one
      setActiveEntry(data)
      setTimeEntries(prev => prev.map(e => 
        e.id === tempEntry.id ? data : e
      ))

      // Update cache
      setCache(`active_timer_${user.id}`, data)
    } catch (err) {
      console.error('Error starting timer:', err)
      setError(err instanceof Error ? err.message : 'Failed to start timer')
      // Rollback optimistic update
      setActiveEntry(null)
      setTimeEntries(prev => prev.filter(e => !e.id.startsWith('temp_')))
    } finally {
      setLoading(false)
    }
  }

  const stopTimer = async () => {
    if (!activeEntry || !user) return

    const endTime = new Date()
    const startTime = new Date(activeEntry.start_time)
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    // Optimistic update
    const updatedEntry: TimeEntry = {
      ...activeEntry,
      end_time: endTime.toISOString(),
      duration
    }

    setActiveEntry(null)
    setTimeEntries(prev => 
      prev.map(entry => entry.id === activeEntry.id ? updatedEntry : entry)
    )

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration
        })
        .eq('id', activeEntry.id)

      if (error) throw error

      // Clear cache
      cacheRef.current.delete(`active_timer_${user.id}`)
    } catch (err) {
      console.error('Error stopping timer:', err)
      // Save to local storage for retry
      batchUpdateQueueRef.current.set(activeEntry.id, {
        end_time: endTime.toISOString(),
        duration
      })
      savePendingUpdates()
    }
  }

  // Batch update implementation
  const updateEntry = async (entryId: string, updates: Partial<TimeEntry>) => {
    // Add to batch queue
    const existing = batchUpdateQueueRef.current.get(entryId) || {}
    batchUpdateQueueRef.current.set(entryId, { ...existing, ...updates })

    // Optimistic update
    setTimeEntries(prev => 
      prev.map(entry => entry.id === entryId 
        ? { ...entry, ...updates }
        : entry
      )
    )

    // Clear existing timeout
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current)
    }

    // Set new timeout for batch processing
    batchUpdateTimeoutRef.current = setTimeout(processBatchUpdates, BATCH_UPDATE_DELAY)
  }

  const processBatchUpdates = async () => {
    const updates = Array.from(batchUpdateQueueRef.current.entries())
    if (updates.length === 0) return

    batchUpdateQueueRef.current.clear()

    for (const [entryId, update] of updates) {
      await applyUpdate(entryId, update)
    }
  }

  const applyUpdate = async (entryId: string, updates: Partial<TimeEntry>) => {
    try {
      // Recalculate duration if times changed
      if (updates.start_time || updates.end_time) {
        const entry = timeEntries.find(e => e.id === entryId)
        if (entry && updates.end_time) {
          const startTime = new Date(updates.start_time || entry.start_time)
          const endTime = new Date(updates.end_time)
          updates.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        }
      }

      const { error } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', entryId)

      if (error) throw error
    } catch (err) {
      console.error('Error updating entry:', err)
      // Save for retry
      batchUpdateQueueRef.current.set(entryId, updates)
      savePendingUpdates()
    }
  }

  const deleteEntry = async (entryId: string) => {
    // Optimistic update
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId))

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
    } catch (err) {
      console.error('Error deleting entry:', err)
      // Rollback on error
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', entryId)
        .single()
      
      if (data) {
        setTimeEntries(prev => [...prev, data])
      }
    }
  }

  const getTaskTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
    const cacheKey = `task_entries_${taskId}`
    const cached = getFromCache<TimeEntry[]>(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('start_time', { ascending: false })

      if (error) throw error
      
      const entries = data || []
      setCache(cacheKey, entries)
      return entries
    } catch (err) {
      console.error('Error fetching task entries:', err)
      return []
    }
  }

  const getUserTimeEntries = async (userId?: string): Promise<TimeEntry[]> => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return []

    const cacheKey = `user_entries_${targetUserId}`
    const cached = getFromCache<TimeEntry[]>(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', targetUserId)
        .order('start_time', { ascending: false })
        .limit(100) // Limit for performance

      if (error) throw error
      
      const entries = data || []
      setCache(cacheKey, entries)
      return entries
    } catch (err) {
      console.error('Error fetching user entries:', err)
      return []
    }
  }

  const getTaskSummary = async (taskId: string): Promise<TaskTimeSummary | null> => {
    const cacheKey = `task_summary_${taskId}`
    const cached = getFromCache<TaskTimeSummary>(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('task_time_summary')
        .select('*')
        .eq('task_id', taskId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore no rows error
      
      if (data) {
        setCache(cacheKey, data)
      }
      return data
    } catch (err) {
      console.error('Error fetching task summary:', err)
      return null
    }
  }

  const getUserTaskSummary = async (taskId: string, userId?: string): Promise<UserTaskTimeSummary | null> => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return null

    const cacheKey = `user_task_summary_${taskId}_${targetUserId}`
    const cached = getFromCache<UserTaskTimeSummary>(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('user_task_time_summary')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', targetUserId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore no rows error
      
      if (data) {
        setCache(cacheKey, data)
      }
      return data
    } catch (err) {
      console.error('Error fetching user task summary:', err)
      return null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current)
        processBatchUpdates() // Process any pending updates
      }
    }
  }, [])

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