'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClientComponentClient } from '@/lib/supabase'
import { Leave, LeaveBalance } from '@/shared/types/database'

export function useLeaves() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaves = async () => {
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
            last_name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeaves(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des congés')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaveBalance = async () => {
    if (!user) return

    try {
      const currentYear = new Date().getFullYear()
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        const newBalance: Partial<LeaveBalance> = {
          user_id: user.id,
          year: currentYear,
          paid_leave_days: 25,
          used_paid_leave_days: 0,
          sick_days: 10,
          used_sick_days: 0,
        }

        const { data: createdBalance, error: createError } = await supabase
          .from('leave_balances')
          .insert(newBalance)
          .select()
          .single()

        if (createError) throw createError
        setLeaveBalance(createdBalance)
      } else {
        setLeaveBalance(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du solde de congés')
    }
  }

  const createLeaveRequest = async (leaveData: Partial<Leave>): Promise<Leave | null> => {
    if (!user) return null

    setError(null)

    try {
      const startDate = new Date(leaveData.start_date!)
      const endDate = new Date(leaveData.end_date!)
      const days_count = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const newLeave: Partial<Leave> = {
        ...leaveData,
        user_id: user.id,
        days_count,
        status: 'pending',
      }

      const { data, error } = await supabase
        .from('leaves')
        .insert(newLeave)
        .select()
        .single()

      if (error) throw error

      setLeaves(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la demande')
      return null
    }
  }

  const updateLeaveRequest = async (id: string, updates: Partial<Leave>): Promise<Leave | null> => {
    setError(null)

    try {
      const { data, error } = await supabase
        .from('leaves')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setLeaves(prev => prev.map(leave => leave.id === id ? data : leave))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
      return null
    }
  }

  const deleteLeaveRequest = async (id: string): Promise<boolean> => {
    setError(null)

    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', id)

      if (error) throw error

      setLeaves(prev => prev.filter(leave => leave.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      return false
    }
  }

  const approveLeaveRequest = async (id: string, approvedBy: string): Promise<boolean> => {
    if (!user) return false

    try {
      const leave = leaves.find(l => l.id === id)
      if (!leave) return false

      await updateLeaveRequest(id, {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })

      if (leaveBalance) {
        const updatedBalance = { ...leaveBalance }
        
        switch (leave.type) {
          case 'vacation':
            updatedBalance.used_paid_leave_days += leave.days_count
            break
          case 'sick':
            updatedBalance.used_sick_days += leave.days_count
            break
        }

        await supabase
          .from('leave_balances')
          .update(updatedBalance)
          .eq('id', leaveBalance.id)

        setLeaveBalance(updatedBalance)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'approbation')
      return false
    }
  }

  const rejectLeaveRequest = async (id: string, rejectedReason: string): Promise<boolean> => {
    return !!(await updateLeaveRequest(id, {
      status: 'rejected',
      rejected_reason: rejectedReason
    }))
  }

  useEffect(() => {
    if (user) {
      fetchLeaves()
      fetchLeaveBalance()
    }
  }, [user])

  return {
    leaves,
    leaveBalance,
    loading,
    error,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    refetch: fetchLeaves,
  }
}