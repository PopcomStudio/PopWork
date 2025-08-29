'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClientComponentClient } from '@/lib/supabase'
import { Notification } from '@/shared/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useNotifications() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])


  const markAsRead = async (notificationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du marquage comme lu')
      return false
    }
  }

  const markAllAsRead = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du marquage comme lu')
      return false
    }
  }

  const deleteNotification = async (notificationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      return false
    }
  }

  const clearAll = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setNotifications([])
      setUnreadCount(0)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      return false
    }
  }


  // Set up real-time subscription
  useEffect(() => {
    if (!user) return

    const newChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  }
}