import { ACTIVITY_MULTIPLIERS, type ActivityLevel } from './nutrition'

export type StrengthIntensity = 'light' | 'moderate' | 'vigorous'

/** Compendium of Physical Activities resistance-training METs (light/moderate/vigorous effort). */
export const STRENGTH_METS: Record<StrengthIntensity, number> = { light: 3.5, moderate: 5, vigorous: 6 }

const DEFAULT_BODY_WEIGHT_KG = 70
/** Generous per-set allowance (work + rest) so a session left running doesn't inflate the estimate. */
const MAX_MINUTES_PER_SET = 4
const SETUP_MINUTES = 5
const MAX_SESSION_MINUTES = 180

/** Completed sets per active minute → effort. ~90 s rest between sets ≈ 0.4 sets/min. */
export function strengthIntensity(completedSets: number, activeMinutes: number): StrengthIntensity {
  if (completedSets <= 0 || activeMinutes <= 0) return 'light'
  const density = completedSets / activeMinutes
  if (density >= 0.4) return 'vigorous'
  if (density >= 0.25) return 'moderate'
  return 'light'
}

/** Elapsed time, bounded by what the completed sets could plausibly have taken. */
export function activeWorkoutMinutes(elapsedMinutes: number, completedSets: number): number {
  if (completedSets <= 0) return 0
  const plausible = completedSets * MAX_MINUTES_PER_SET + SETUP_MINUTES
  return Math.max(1, Math.min(Math.round(elapsedMinutes), plausible, MAX_SESSION_MINUTES))
}

/**
 * Net energy of a strength session: (MET − 1) × kg × hours. Subtracting the resting MET keeps
 * the BMR already counted in TDEE from being counted twice.
 */
export function netStrengthKcal(input: {
  elapsedMinutes: number
  completedSets: number
  bodyWeightKg?: number | null
}): { kcal: number; activeMinutes: number; intensity: StrengthIntensity; met: number } {
  const activeMinutes = activeWorkoutMinutes(input.elapsedMinutes, input.completedSets)
  const intensity = strengthIntensity(input.completedSets, activeMinutes)
  const met = STRENGTH_METS[intensity]
  const weight = input.bodyWeightKg && input.bodyWeightKg > 0 ? input.bodyWeightKg : DEFAULT_BODY_WEIGHT_KG
  const kcal = Math.max(0, Math.round((met - 1) * weight * (activeMinutes / 60)))
  return { kcal, activeMinutes, intensity, met }
}

/**
 * Daily activity energy the chosen activity level already budgets for:
 * TDEE − sedentary TDEE = TDEE × (1 − 1.2 / multiplier).
 */
export function activityAllowanceKcal(tdee: number, activity: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activity]
  if (!tdee || tdee <= 0) return 0
  return Math.round(tdee * (1 - ACTIVITY_MULTIPLIERS.sedentary / multiplier))
}

/** Exercise calories added back to today's budget: only what exceeds the activity allowance. */
export function exerciseCreditKcal(burnedKcal: number, tdee: number | null | undefined, activity: ActivityLevel | null | undefined): number {
  if (burnedKcal <= 0) return 0
  if (!tdee || !activity) return Math.round(burnedKcal)
  return Math.max(0, Math.round(burnedKcal - activityAllowanceKcal(tdee, activity)))
}
