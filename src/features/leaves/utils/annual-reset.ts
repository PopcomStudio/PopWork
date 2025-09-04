/**
 * Annual Leave Reset Logic
 * Handles the automatic reset of leave entitlements on June 1st according to French law
 */

import { createClientComponentClient } from '@/lib/supabase'
import { getFrenchReferenceYear, calculateLeaveEntitlements } from './french-leave-calculator'

export interface AnnualResetResult {
  processedUsers: number
  errors: string[]
  summary: {
    totalBalancesUpdated: number
    totalUnusedLeavesExpired: number
  }
}

/**
 * Process annual leave reset for all employees
 * Should be run on June 1st each year
 */
export async function processAnnualLeaveReset(): Promise<AnnualResetResult> {
  const supabase = createServerComponentClient()
  const errors: string[] = []
  let processedUsers = 0
  let totalBalancesUpdated = 0
  let totalUnusedLeavesExpired = 0

  try {
    // Get all active users with their leave profiles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        firstName,
        lastName,
        workingHoursPerWeek,
        contractType,
        createdAt,
        employee_leave_profiles (*)
      `)

    if (usersError) {
      errors.push(`Erreur lors de la récupération des utilisateurs: ${usersError.message}`)
      return { processedUsers: 0, errors, summary: { totalBalancesUpdated: 0, totalUnusedLeavesExpired: 0 } }
    }

    if (!users || users.length === 0) {
      return { processedUsers: 0, errors: ['Aucun utilisateur trouvé'], summary: { totalBalancesUpdated: 0, totalUnusedLeavesExpired: 0 } }
    }

    const currentYear = new Date().getFullYear()
    const { start: newPeriodStart, end: newPeriodEnd } = getFrenchReferenceYear()

    // Process each user
    for (const user of users) {
      try {
        // Get current leave balance
        const { data: currentBalance, error: balanceError } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('user_id', user.id)
          .eq('year', currentYear)
          .single()

        // Log unused leaves that will expire
        if (currentBalance && !balanceError) {
          const unusedPaidLeaves = currentBalance.paid_leave_days - currentBalance.used_paid_leave_days
          const unusedRttDays = (currentBalance.rtt_days || 0) - (currentBalance.used_rtt_days || 0)
          
          if (unusedPaidLeaves > 0 || unusedRttDays > 0) {
            // Log expired leaves for audit purposes
            await supabase
              .from('leave_audit_log')
              .insert({
                user_id: user.id,
                action: 'annual_expiration',
                details: {
                  expired_paid_leaves: unusedPaidLeaves,
                  expired_rtt_days: unusedRttDays,
                  reference_period: `${currentBalance.reference_period_start} to ${currentBalance.reference_period_end}`
                },
                created_at: new Date().toISOString()
              })

            totalUnusedLeavesExpired += unusedPaidLeaves + unusedRttDays
          }
        }

        // Calculate new entitlements
        const profile = user.employee_leave_profiles?.[0]
        const hireDate = profile?.hire_date || user.createdAt
        const workingHours = profile?.working_hours_per_week || user.workingHoursPerWeek || 35

        const entitlements = calculateLeaveEntitlements({
          hireDate,
          workingHoursPerWeek: workingHours,
          referenceYearStart: newPeriodStart,
          referenceYearEnd: newPeriodEnd
        })

        // Create/update leave balance for new year
        const newBalanceData = {
          user_id: user.id,
          year: currentYear,
          paid_leave_days: entitlements.earnedPaidLeaveDays,
          used_paid_leave_days: 0, // Reset used days
          rtt_days: entitlements.rttDays,
          used_rtt_days: 0, // Reset used RTT days
          sick_days: 10, // Standard sick days allocation
          used_sick_days: 0, // Reset used sick days
          reference_period_start: newPeriodStart.toISOString(),
          reference_period_end: newPeriodEnd.toISOString(),
          months_worked: entitlements.monthsWorked,
        }

        if (currentBalance) {
          // Update existing balance
          const { error: updateError } = await supabase
            .from('leave_balances')
            .update(newBalanceData)
            .eq('id', currentBalance.id)

          if (updateError) {
            errors.push(`Erreur mise à jour balance pour ${user.email}: ${updateError.message}`)
            continue
          }
        } else {
          // Create new balance
          const { error: insertError } = await supabase
            .from('leave_balances')
            .insert(newBalanceData)

          if (insertError) {
            errors.push(`Erreur création balance pour ${user.email}: ${insertError.message}`)
            continue
          }
        }

        // Update employee profile seniority
        if (profile) {
          const hireDateObj = new Date(hireDate)
          const seniorityMonths = Math.floor(
            (newPeriodStart.getTime() - hireDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          )

          await supabase
            .from('employee_leave_profiles')
            .update({
              seniority_months: seniorityMonths,
              current_year_earned_days: entitlements.earnedPaidLeaveDays
            })
            .eq('id', profile.id)
        }

        processedUsers++
        totalBalancesUpdated++

      } catch (userError) {
        errors.push(`Erreur traitement utilisateur ${user.email}: ${userError}`)
      }
    }

    // Log the annual reset completion
    await supabase
      .from('system_audit_log')
      .insert({
        action: 'annual_leave_reset',
        details: {
          processed_users: processedUsers,
          total_balances_updated: totalBalancesUpdated,
          total_unused_leaves_expired: totalUnusedLeavesExpired,
          errors_count: errors.length
        },
        created_at: new Date().toISOString()
      })

    return {
      processedUsers,
      errors,
      summary: {
        totalBalancesUpdated,
        totalUnusedLeavesExpired
      }
    }

  } catch (error) {
    errors.push(`Erreur critique lors du reset annuel: ${error}`)
    return {
      processedUsers,
      errors,
      summary: {
        totalBalancesUpdated,
        totalUnusedLeavesExpired
      }
    }
  }
}

/**
 * Check if annual reset is due
 */
export function isAnnualResetDue(lastResetDate?: Date): boolean {
  const now = new Date()
  const currentYear = now.getFullYear()
  const thisYearResetDate = new Date(currentYear, 5, 1) // June 1st
  
  if (!lastResetDate) {
    return now >= thisYearResetDate
  }

  return now >= thisYearResetDate && lastResetDate < thisYearResetDate
}

/**
 * Get next reset date
 */
export function getNextResetDate(): Date {
  const now = new Date()
  const currentYear = now.getFullYear()
  const thisYearResetDate = new Date(currentYear, 5, 1) // June 1st
  
  if (now < thisYearResetDate) {
    return thisYearResetDate
  } else {
    return new Date(currentYear + 1, 5, 1) // June 1st next year
  }
}

/**
 * Send notification about upcoming leave expiration
 * Should be run 30 days before June 1st
 */
export async function notifyUpcomingLeaveExpiration(): Promise<void> {
  const supabase = createServerComponentClient()
  const { end: currentPeriodEnd } = getFrenchReferenceYear()
  const now = new Date()
  const daysUntilExpiration = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Only send notification if 30 days or less until expiration
  if (daysUntilExpiration > 30) return

  // Get users with unused leaves
  const { data: balances, error } = await supabase
    .from('leave_balances')
    .select(`
      *,
      users (
        id,
        email,
        firstName,
        lastName
      )
    `)
    .eq('year', now.getFullYear())

  if (error || !balances) return

  for (const balance of balances) {
    const unusedPaidLeaves = balance.paid_leave_days - balance.used_paid_leave_days
    const unusedRttDays = (balance.rtt_days || 0) - (balance.used_rtt_days || 0)
    
    if (unusedPaidLeaves > 0 || unusedRttDays > 0) {
      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: balance.user_id,
          title: 'Congés bientôt expirés',
          message: `Attention ! Il vous reste ${unusedPaidLeaves} jours de congés payés et ${unusedRttDays} jours RTT qui expirent le ${currentPeriodEnd.toLocaleDateString('fr-FR')}.`,
          type: 'warning',
          category: 'leaves',
          metadata: {
            unused_paid_leaves: unusedPaidLeaves,
            unused_rtt_days: unusedRttDays,
            expiration_date: currentPeriodEnd.toISOString(),
            days_until_expiration: daysUntilExpiration
          }
        })
    }
  }
}