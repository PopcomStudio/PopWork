'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClientComponentClient } from '@/lib/supabase'
import { Leave, LeaveBalance } from '@/shared/types/database'

export function useLeavesAdmin() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [allLeaves, setAllLeaves] = useState<Leave[]>([])
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllLeaves = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          users!user_id (
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
  }, [user, supabase])

  const approveLeaveBatch = async (leaveIds: string[]): Promise<boolean> => {
    if (!user) return false

    setError(null)

    try {
      // First, get the leaves to approve
      const { data: leavesToApprove, error: fetchError } = await supabase
        .from('leaves')
        .select('*')
        .in('id', leaveIds)

      if (fetchError) throw fetchError

      // Update the leaves status
      const { error } = await supabase
        .from('leaves')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', leaveIds)

      if (error) throw error

      // Update leave balances for each approved leave
      for (const leave of leavesToApprove || []) {
        const { data: currentBalance, error: balanceError } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('user_id', leave.user_id)
          .eq('year', new Date().getFullYear())
          .single()

        if (balanceError && balanceError.code !== 'PGRST116') {
          console.error('Error fetching balance:', balanceError)
          continue
        }

        if (currentBalance) {
          const updatedBalance: Partial<LeaveBalance> = { ...currentBalance }
          
          switch (leave.type) {
            case 'conges_payes':
              updatedBalance.used_paid_leave_days = (currentBalance.used_paid_leave_days || 0) + leave.days_count
              break
            case 'rtt':
              updatedBalance.used_rtt_days = (currentBalance.used_rtt_days || 0) + leave.days_count
              break
            case 'sick':
              updatedBalance.used_sick_days = (currentBalance.used_sick_days || 0) + leave.days_count
              break
          }

          const { error: updateError } = await supabase
            .from('leave_balances')
            .update(updatedBalance)
            .eq('id', currentBalance.id)

          if (updateError) {
            console.error('Error updating balance:', updateError)
          }
        }
      }

      setAllLeaves(prev => 
        prev.map(leave => 
          leaveIds.includes(leave.id)
            ? { ...leave, status: 'approved' as const, approved_by: user.id, approved_at: new Date().toISOString() }
            : leave
        )
      )

      // Refresh employee balances
      await fetchEmployeeBalances()

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

  const rejectLeave = async (leaveId: string, rejectedReason: string): Promise<boolean> => {
    return rejectLeaveBatch([leaveId], rejectedReason)
  }

  const fetchEmployeeBalances = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          users!user_id (
            id,
            first_name,
            last_name,
            email,
            working_hours_per_week,
            contract_type
          )
        `)
        .eq('year', new Date().getFullYear())

      if (error) throw error
      setEmployeeBalances(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des soldes')
    }
  }, [user, supabase])

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
      fetchEmployeeBalances()
    }
  }, [user, fetchAllLeaves, fetchEmployeeBalances])

  return {
    allLeaves,
    employeeBalances,
    loading,
    error,
    approveLeaveBatch,
    rejectLeaveBatch,
    rejectLeave,
    deleteLeave,
    getLeavesByStatus,
    getLeavesByUser,
    getLeaveStats,
    fetchEmployeeBalances,
    refetch: fetchAllLeaves,
  }
}