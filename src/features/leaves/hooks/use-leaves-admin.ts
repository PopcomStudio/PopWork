'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClientComponentClient } from '@/lib/supabase'
import { Leave } from '@/shared/types/database'

export function useLeavesAdmin() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [allLeaves, setAllLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllLeaves = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllLeaves(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des congés')
    } finally {
      setLoading(false)
    }
  }

  const approveLeaveBatch = async (leaveIds: string[]): Promise<boolean> => {
    if (!user) return false

    setError(null)

    try {
      const { error } = await supabase
        .from('leaves')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', leaveIds)

      if (error) throw error

      setAllLeaves(prev => 
        prev.map(leave => 
          leaveIds.includes(leave.id)
            ? { ...leave, status: 'approved' as const, approved_by: user.id, approved_at: new Date().toISOString() }
            : leave
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'approbation')
      return false
    }
  }

  const rejectLeaveBatch = async (leaveIds: string[], rejectedReason: string): Promise<boolean> => {
    setError(null)

    try {
      const { error } = await supabase
        .from('leaves')
        .update({
          status: 'rejected',
          rejected_reason: rejectedReason
        })
        .in('id', leaveIds)

      if (error) throw error

      setAllLeaves(prev => 
        prev.map(leave => 
          leaveIds.includes(leave.id)
            ? { ...leave, status: 'rejected' as const, rejected_reason: rejectedReason }
            : leave
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet')
      return false
    }
  }

  const deleteLeave = async (leaveId: string): Promise<boolean> => {
    setError(null)

    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId)

      if (error) throw error

      setAllLeaves(prev => prev.filter(leave => leave.id !== leaveId))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      return false
    }
  }

  const getLeavesByStatus = (status: Leave['status']) => {
    return allLeaves.filter(leave => leave.status === status)
  }

  const getLeavesByUser = (userId: string) => {
    return allLeaves.filter(leave => leave.user_id === userId)
  }

  const getLeaveStats = () => {
    const pending = allLeaves.filter(leave => leave.status === 'pending').length
    const approved = allLeaves.filter(leave => leave.status === 'approved').length
    const rejected = allLeaves.filter(leave => leave.status === 'rejected').length
    
    return { pending, approved, rejected, total: allLeaves.length }
  }

  useEffect(() => {
    if (user) {
      fetchAllLeaves()
    }
  }, [user])

  return {
    allLeaves,
    loading,
    error,
    approveLeaveBatch,
    rejectLeaveBatch,
    deleteLeave,
    getLeavesByStatus,
    getLeavesByUser,
    getLeaveStats,
    refetch: fetchAllLeaves,
  }
}