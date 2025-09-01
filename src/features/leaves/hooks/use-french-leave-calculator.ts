'use client'

import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { LeaveBalance } from '@/shared/types/database'
import { 
  calculateLeaveEntitlements,
  getFrenchReferenceYear,
  getDaysUntilRenewal,
  LeaveCalculationResult
} from '../utils/french-leave-calculator'

export function useFrenchLeaveCalculator() {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Calculate leave entitlements for a user based on their profile
   */
  const calculateUserLeaveEntitlements = useCallback(async (
    userId: string
  ): Promise<LeaveCalculationResult | null> => {
    setLoading(true)
    setError(null)

    try {
      // Fetch user profile with leave information
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          employee_leave_profiles (*)
        `)
        .eq('id', userId)
        .single()

      if (userError) throw userError
      if (!user) throw new Error('Utilisateur non trouvé')

      // Get employee leave profile or create default
      let profile = user.employee_leave_profiles?.[0]
      
      if (!profile) {
        // Create default profile for existing user
        const defaultProfile = {
          user_id: userId,
          hire_date: user.createdAt || new Date().toISOString(),
          working_hours_per_week: user.workingHoursPerWeek || 35,
          contract_type: user.contractType || 'full_time',
          seniority_months: 0,
          current_year_earned_days: 0
        }

        const { data: newProfile, error: profileError } = await supabase
          .from('employee_leave_profiles')
          .insert(defaultProfile)
          .select()
          .single()

        if (profileError) throw profileError
        profile = newProfile
      }

      // Calculate entitlements based on current reference year
      const { start, end } = getFrenchReferenceYear()
      
      const entitlements = calculateLeaveEntitlements({
        hireDate: profile.hire_date,
        workingHoursPerWeek: profile.working_hours_per_week,
        referenceYearStart: start,
        referenceYearEnd: end
      })

      return entitlements
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul des congés')
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * Update or create leave balance for a user based on calculated entitlements
   */
  const updateUserLeaveBalance = useCallback(async (
    userId: string,
    entitlements: LeaveCalculationResult
  ): Promise<LeaveBalance | null> => {
    setLoading(true)
    setError(null)

    try {
      const currentYear = new Date().getFullYear()
      const { start, end } = getFrenchReferenceYear()

      // Check if balance exists for current year
      const { data: existingBalance, error: balanceError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .single()

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError
      }

      const balanceData = {
        user_id: userId,
        year: currentYear,
        paid_leave_days: entitlements.earnedPaidLeaveDays,
        used_paid_leave_days: existingBalance?.used_paid_leave_days || 0,
        rtt_days: entitlements.rttDays,
        used_rtt_days: existingBalance?.used_rtt_days || 0,
        sick_days: existingBalance?.sick_days || 10,
        used_sick_days: existingBalance?.used_sick_days || 0,
        reference_period_start: start.toISOString(),
        reference_period_end: end.toISOString(),
        months_worked: entitlements.monthsWorked,
      }

      if (existingBalance) {
        // Update existing balance
        const { data, error } = await supabase
          .from('leave_balances')
          .update(balanceData)
          .eq('id', existingBalance.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new balance
        const { data, error } = await supabase
          .from('leave_balances')
          .insert(balanceData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du solde')
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * Recalculate and update leave entitlements for a user
   */
  const recalculateUserLeaves = useCallback(async (userId: string): Promise<LeaveBalance | null> => {
    const entitlements = await calculateUserLeaveEntitlements(userId)
    if (!entitlements) return null

    return await updateUserLeaveBalance(userId, entitlements)
  }, [calculateUserLeaveEntitlements, updateUserLeaveBalance])

  /**
   * Check if user's leaves are about to expire
   */
  const checkLeaveExpirationWarning = useCallback((): {
    isExpiring: boolean
    daysUntilExpiration: number
    expirationDate: Date
  } => {
    const daysUntilRenewal = getDaysUntilRenewal()
    const { end } = getFrenchReferenceYear()
    
    return {
      isExpiring: daysUntilRenewal <= 30, // Warn 30 days before expiration
      daysUntilExpiration: daysUntilRenewal,
      expirationDate: end
    }
  }, [])

  /**
   * Update employee working hours and recalculate RTT
   */
  const updateEmployeeWorkingHours = useCallback(async (
    userId: string,
    workingHoursPerWeek: number
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({ workingHoursPerWeek })
        .eq('id', userId)

      if (userError) throw userError

      // Update employee leave profile
      const { error: profileError } = await supabase
        .from('employee_leave_profiles')
        .update({ working_hours_per_week: workingHoursPerWeek })
        .eq('user_id', userId)

      if (profileError) throw profileError

      // Recalculate leave entitlements
      await recalculateUserLeaves(userId)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des horaires')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase, recalculateUserLeaves])

  return {
    loading,
    error,
    calculateUserLeaveEntitlements,
    updateUserLeaveBalance,
    recalculateUserLeaves,
    checkLeaveExpirationWarning,
    updateEmployeeWorkingHours,
  }
}