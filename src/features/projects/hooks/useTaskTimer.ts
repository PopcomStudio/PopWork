"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'

interface ActiveTimer {
  id: string
  taskId: string
  startTime: string
  elapsedSeconds: number
}

interface UseTaskTimerReturn {
  // État du timer
  activeTimer: ActiveTimer | null
  isRunning: boolean
  elapsedTime: number // temps en secondes depuis le démarrage
  formattedTime: string // temps formatté HH:MM:SS
  
  // Actions
  startTimer: (taskId: string) => Promise<void>
  stopTimer: () => Promise<void>
  pauseTimer: () => void
  resumeTimer: () => void
  
  // Données
  getTaskTimeLogged: (taskId: string) => Promise<number>
  getUserTimeLogs: (taskId: string) => Promise<Array<{
    startTime: string
    endTime: string
    duration: number
  }>>
  
  // État
  loading: boolean
  error: string | null
}

export function useTaskTimer(): UseTaskTimerReturn {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout>()
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  // Formater le temps en HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [hours, minutes, secs]
      .map(v => v.toString().padStart(2, '0'))
      .join(':')
  }, [])

  const formattedTime = formatTime(elapsedTime)

  // Récupérer le timer actif au chargement
  const loadActiveTimer = useCallback(async () => {
    if (!user) return

    try {
      const { data, error: fetchError } = await supabase
        .from('task_timers')
        .select('*')
        .eq('userId', user.id)
        .is('endTime', null)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (data) {
        const startTime = new Date(data.startTime)
        const now = new Date()
        const elapsedMs = now.getTime() - startTime.getTime()
        const elapsedSeconds = Math.floor(elapsedMs / 1000)

        setActiveTimer({
          id: data.id,
          taskId: data.taskId,
          startTime: data.startTime,
          elapsedSeconds
        })
        setElapsedTime(elapsedSeconds)
        setIsRunning(true)
      }
    } catch (err) {
      console.error('Erreur chargement timer actif:', err)
    }
  }, [user, supabase])

  // Démarrer un timer
  const startTimer = useCallback(async (taskId: string) => {
    if (!user) {
      setError('Utilisateur non connecté')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Arrêter le timer actuel s'il y en a un
      if (activeTimer) {
        await stopTimer()
      }

      const startTime = new Date().toISOString()

      const { data, error: insertError } = await supabase
        .from('task_timers')
        .insert([{
          taskId,
          userId: user.id,
          startTime
        }])
        .select()
        .single()

      if (insertError) throw insertError

      setActiveTimer({
        id: data.id,
        taskId,
        startTime,
        elapsedSeconds: 0
      })
      setElapsedTime(0)
      setIsRunning(true)

    } catch (err) {
      console.error('Erreur démarrage timer:', err)
      setError(err instanceof Error ? err.message : 'Erreur démarrage timer')
    } finally {
      setLoading(false)
    }
  }, [user, supabase, activeTimer])

  // Arrêter le timer
  const stopTimer = useCallback(async () => {
    if (!activeTimer) return

    try {
      setLoading(true)
      setError(null)

      const endTime = new Date().toISOString()
      const duration = elapsedTime // durée en secondes

      const { error: updateError } = await supabase
        .from('task_timers')
        .update({
          endTime,
          duration
        })
        .eq('id', activeTimer.id)

      if (updateError) throw updateError

      // Arrêter l'interval et réinitialiser l'état
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      setActiveTimer(null)
      setElapsedTime(0)
      setIsRunning(false)

    } catch (err) {
      console.error('Erreur arrêt timer:', err)
      setError(err instanceof Error ? err.message : 'Erreur arrêt timer')
    } finally {
      setLoading(false)
    }
  }, [activeTimer, elapsedTime, supabase])

  // Mettre en pause (local seulement)
  const pauseTimer = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  // Reprendre (local seulement)
  const resumeTimer = useCallback(() => {
    if (activeTimer) {
      setIsRunning(true)
    }
  }, [activeTimer])

  // Récupérer le temps total loggué pour une tâche
  const getTaskTimeLogged = useCallback(async (taskId: string): Promise<number> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('task_timers')
        .select('duration')
        .eq('taskId', taskId)
        .not('duration', 'is', null)

      if (fetchError) throw fetchError

      return data.reduce((total, timer) => total + (timer.duration || 0), 0)
    } catch (err) {
      console.error('Erreur récupération temps loggué:', err)
      return 0
    }
  }, [supabase])

  // Récupérer les logs de temps d'un utilisateur pour une tâche
  const getUserTimeLogs = useCallback(async (taskId: string) => {
    if (!user) return []

    try {
      const { data, error: fetchError } = await supabase
        .from('task_timers')
        .select('startTime, endTime, duration')
        .eq('taskId', taskId)
        .eq('userId', user.id)
        .not('endTime', 'is', null)
        .order('startTime', { ascending: false })

      if (fetchError) throw fetchError

      return data || []
    } catch (err) {
      console.error('Erreur récupération logs utilisateur:', err)
      return []
    }
  }, [user, supabase])

  // Effet pour l'interval du timer
  useEffect(() => {
    if (isRunning && activeTimer) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(activeTimer.startTime)
        const now = new Date()
        const elapsedMs = now.getTime() - startTime.getTime()
        const elapsedSeconds = Math.floor(elapsedMs / 1000)
        
        setElapsedTime(elapsedSeconds)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, activeTimer])

  // Charger le timer actif au montage
  useEffect(() => {
    loadActiveTimer()
  }, [loadActiveTimer])

  // Sauvegarder automatiquement toutes les 30 secondes
  useEffect(() => {
    if (!isRunning || !activeTimer) return

    const autoSaveInterval = setInterval(async () => {
      try {
        // Mettre à jour la durée dans la DB sans terminer le timer
        await supabase
          .from('task_timers')
          .update({ duration: elapsedTime })
          .eq('id', activeTimer.id)
      } catch (err) {
        console.error('Erreur sauvegarde automatique:', err)
      }
    }, 30000) // 30 secondes

    return () => clearInterval(autoSaveInterval)
  }, [isRunning, activeTimer, elapsedTime, supabase])

  // Nettoyer à la fermeture
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    activeTimer,
    isRunning,
    elapsedTime,
    formattedTime,
    
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    
    getTaskTimeLogged,
    getUserTimeLogs,
    
    loading,
    error
  }
}