"use client"

import { useEffect, useState, useCallback, useRef } from 'react'

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
  startTimer: (taskId?: string) => Promise<void>
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

export function useTaskTimer(taskId?: string): UseTaskTimerReturn {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout>()

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

  // Arrêter le timer
  const stopTimer = useCallback(async () => {
    if (!activeTimer) return

    try {
      setLoading(true)

      // Calculer la durée totale
      const duration = elapsedTime

      // Sauvegarder en local storage pour simuler la persistance
      const savedTimes = JSON.parse(localStorage.getItem('task_times') || '{}')
      const currentTime = savedTimes[activeTimer.taskId] || 0
      savedTimes[activeTimer.taskId] = currentTime + duration
      localStorage.setItem('task_times', JSON.stringify(savedTimes))

      // Réinitialiser le timer
      setActiveTimer(null)
      setIsRunning(false)
      setElapsedTime(0)

      // Arrêter l'interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

    } catch (err) {
      console.error('Erreur arrêt timer:', err)
      setError(err instanceof Error ? err.message : 'Erreur arrêt timer')
    } finally {
      setLoading(false)
    }
  }, [activeTimer, elapsedTime])

  // Démarrer un timer (version simplifiée pour les tests)
  const startTimer = useCallback(async (targetTaskId?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Arrêter le timer actuel s'il y en a un
      if (activeTimer) {
        // Arrêt immédiat sans attendre pour éviter la dépendance circulaire
        const duration = elapsedTime
        const savedTimes = JSON.parse(localStorage.getItem('task_times') || '{}')
        const currentTime = savedTimes[activeTimer.taskId] || 0
        savedTimes[activeTimer.taskId] = currentTime + duration
        localStorage.setItem('task_times', JSON.stringify(savedTimes))
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }

      const startTime = new Date().toISOString()
      const newTimer: ActiveTimer = {
        id: `timer_${Date.now()}`,
        taskId: targetTaskId || taskId || '',
        startTime,
        elapsedSeconds: 0
      }

      setActiveTimer(newTimer)
      setElapsedTime(0)
      setIsRunning(true)

    } catch (err) {
      console.error('Erreur démarrage timer:', err)
      setError(err instanceof Error ? err.message : 'Erreur démarrage timer')
    } finally {
      setLoading(false)
    }
  }, [taskId, activeTimer, elapsedTime])

  // Mettre en pause le timer
  const pauseTimer = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  // Reprendre le timer
  const resumeTimer = useCallback(() => {
    if (activeTimer) {
      setIsRunning(true)
    }
  }, [activeTimer])

  // Récupérer le temps loggué pour une tâche
  const getTaskTimeLogged = useCallback(async (taskId: string): Promise<number> => {
    const savedTimes = JSON.parse(localStorage.getItem('task_times') || '{}')
    return savedTimes[taskId] || 0
  }, [])

  // Récupérer les logs de temps pour un utilisateur sur une tâche
  const getUserTimeLogs = useCallback(async () => {
    // Version simplifiée pour les tests
    return []
  }, [])

  // Gérer l'interval du timer
  useEffect(() => {
    if (isRunning && activeTimer) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
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