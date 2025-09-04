/**
 * French Leave Calculation Utilities
 * Implements French labor law for leave calculations (Code du travail)
 */

export interface LeaveCalculationParams {
  hireDate: string
  workingHoursPerWeek: number
  referenceYearStart: Date
  referenceYearEnd: Date
  currentDate?: Date
}

export interface LeaveCalculationResult {
  totalPaidLeaveDays: number
  earnedPaidLeaveDays: number
  rttDays: number
  monthsWorked: number
  isEligibleForFullYear: boolean
}

/**
 * Calculate earned paid leave days according to French law
 * - 2.5 days per month of effective work
 * - Maximum 30 working days (5 weeks) per year
 * - Reference period: June 1st to May 31st
 */
export function calculatePaidLeaveDays(params: LeaveCalculationParams): number {
  const { hireDate, referenceYearStart, referenceYearEnd, currentDate = new Date() } = params
  
  const hireDateTime = new Date(hireDate)
  const workStartDate = new Date(Math.max(hireDateTime.getTime(), referenceYearStart.getTime()))
  const workEndDate = new Date(Math.min(currentDate.getTime(), referenceYearEnd.getTime()))
  
  // Calculate months worked in the reference period
  const monthsWorked = calculateMonthsWorked(workStartDate, workEndDate)
  
  // 2.5 days per month worked, with max 30 days
  const earnedDays = Math.min(monthsWorked * 2.5, 30)
  
  return Math.floor(earnedDays)
}

/**
 * Calculate RTT days based on working hours exceeding 35h/week
 * Formula: (weekly hours - 35) / 8 * number of working weeks
 */
export function calculateRttDays(params: LeaveCalculationParams): number {
  const { workingHoursPerWeek } = params
  
  if (workingHoursPerWeek <= 35) {
    return 0
  }
  
  const extraHoursPerWeek = workingHoursPerWeek - 35
  const hoursPerDay = 8
  
  // Calculate working weeks in the year (52 weeks minus vacation weeks)
  const totalWeeks = 52
  const vacationWeeks = 5 // Standard 5 weeks vacation
  const workingWeeks = totalWeeks - vacationWeeks
  
  // RTT calculation: extra hours per week / hours per day
  const rttDaysPerWeek = extraHoursPerWeek / hoursPerDay
  const totalRttDays = rttDaysPerWeek * workingWeeks
  
  return Math.floor(totalRttDays)
}

/**
 * Calculate months worked between two dates
 * Considers partial months (4 weeks = 1 month according to French law)
 */
export function calculateMonthsWorked(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0
  
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const daysWorked = Math.ceil((endDate.getTime() - startDate.getTime()) / millisecondsPerDay)
  
  // French law: 4 weeks (24 working days) = 1 month
  const daysPerMonth = 24
  return Math.min(daysWorked / daysPerMonth, 12)
}

/**
 * Get the current French reference year period (June 1st to May 31st)
 */
export function getFrenchReferenceYear(date: Date = new Date()): { start: Date; end: Date } {
  const year = date.getFullYear()
  const currentMonth = date.getMonth() // 0-based
  
  let referenceYear: number
  
  // If we're between June and December, reference year starts this year
  // If we're between January and May, reference year started last year
  if (currentMonth >= 5) { // June (5) to December (11)
    referenceYear = year
  } else { // January (0) to May (4)
    referenceYear = year - 1
  }
  
  const start = new Date(referenceYear, 5, 1) // June 1st
  const end = new Date(referenceYear + 1, 4, 31) // May 31st next year
  
  return { start, end }
}

/**
 * Check if leave days expire (June 1st deadline)
 */
export function checkLeaveExpiration(currentDate: Date = new Date()): boolean {
  const { end } = getFrenchReferenceYear(currentDate)
  return currentDate > end
}

/**
 * Calculate comprehensive leave entitlements for an employee
 */
export function calculateLeaveEntitlements(params: LeaveCalculationParams): LeaveCalculationResult {
  const { referenceYearStart, referenceYearEnd, currentDate = new Date() } = params
  
  const monthsWorked = calculateMonthsWorked(
    new Date(Math.max(new Date(params.hireDate).getTime(), referenceYearStart.getTime())),
    new Date(Math.min(currentDate.getTime(), referenceYearEnd.getTime()))
  )
  
  const totalPaidLeaveDays = 30 // Maximum annual entitlement
  const earnedPaidLeaveDays = calculatePaidLeaveDays(params)
  const rttDays = calculateRttDays(params)
  const isEligibleForFullYear = monthsWorked >= 12
  
  return {
    totalPaidLeaveDays,
    earnedPaidLeaveDays,
    rttDays,
    monthsWorked,
    isEligibleForFullYear
  }
}

/**
 * Calculate days until next leave renewal (June 1st)
 */
export function getDaysUntilRenewal(currentDate: Date = new Date()): number {
  const nextRenewal = new Date(currentDate.getFullYear(), 5, 1) // June 1st this year
  
  // If we're past June 1st, next renewal is next year
  if (currentDate > nextRenewal) {
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1)
  }
  
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.ceil((nextRenewal.getTime() - currentDate.getTime()) / millisecondsPerDay)
}