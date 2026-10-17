import {
  CALORIES_PER_KG_FAT,
  type FitnessGoal,
  GOAL_OPTIONS,
  type GoalPace,
  GOAL_PACE_KG_PER_WEEK,
  goalPaceKgPerWeek,
  type NutritionPlan,
} from './nutrition'
import type { ProfileDocument } from './profile'

export type { FitnessGoal, GoalPace } from './nutrition'

/**
 * Machine-readable weight/energy goal state.
 *
 * This is the canonical representation the app writes during onboarding and
 * reads when rendering progress. Imperial units are a display concern only;
 * all stored values are metric and all dates are ISO 8601.
 */
export type GoalState = {
  /** 'lose' | 'maintain' | 'gain' */
  type: FitnessGoal
  /** Signed weekly body-mass change: negative for loss, positive for gain, zero for maintenance. */
  paceKgPerWeek: number
  /** Body weight (kg) recorded when the goal was created. */
  startWeightKg: number
  /** Desired body weight (kg). */
  targetWeightKg: number
  /** ISO datetime when the goal was created. */
  startDate: string
  /** Estimated whole weeks to reach targetWeightKg at the current pace. */
  estimatedWeeks: number
}

export type GoalProgress = {
  /** 0–1 fractional completion toward the weight goal. */
  progress: number
  currentWeightKg: number
  startWeightKg: number
  targetWeightKg: number
  /** Signed weekly body-mass change rate from the goal. */
  paceKgPerWeek: number
  /** Whole weeks elapsed since goal_start_date. */
  elapsedWeeks: number
  estimatedWeeks: number
  /** Whole weeks remaining at the stated pace; null when maintaining. */
  weeksRemaining: number | null
  /** Expected weight today if the user had followed the plan exactly. */
  expectedWeightKg: number
  /** True if current weight is within ±1 week's progress of the expected weight. */
  isOnTrack: boolean | null
}

export type GoalSummary = {
  label: string
  targetWeightDisplay: string | null
  paceDisplay: string | null
  progressDisplay: string | null
  weeksDisplay: string | null
}

export const GOAL_TYPE_OPTIONS = GOAL_OPTIONS

// ⚡ Bolt: Module-level Map for O(1) goal label lookup, eliminating linear Array.prototype.find scanning.
const GOAL_TYPE_LABEL_MAP = new Map<FitnessGoal, string>(
  GOAL_OPTIONS.map((option) => [option.value, option.label]),
)

export function goalTypeLabel(goal: FitnessGoal): string {
  return GOAL_TYPE_LABEL_MAP.get(goal) ?? 'Maintain weight'
}

export function goalPaceFromPreset(goal: FitnessGoal, pace: GoalPace): number {
  return goalPaceKgPerWeek(goal, pace)
}

export function weeklyEnergyDeltaKcal(paceKgPerWeek: number): number {
  return Math.round(paceKgPerWeek * CALORIES_PER_KG_FAT)
}

export function estimateWeeksToGoal(
  startWeightKg: number,
  targetWeightKg: number,
  paceKgPerWeek: number,
): number {
  const diffKg = Math.abs(targetWeightKg - startWeightKg)
  const absPace = Math.abs(paceKgPerWeek)
  if (absPace === 0) return 0
  return Math.max(0, Math.round(diffKg / absPace))
}

export function buildGoalState(input: {
  goal: FitnessGoal
  pace: GoalPace
  startWeightKg: number
  targetWeightKg: number
  startDate?: Date
}): GoalState {
  const paceKgPerWeek = goalPaceFromPreset(input.goal, input.pace)
  return {
    type: input.goal,
    paceKgPerWeek,
    startWeightKg: input.startWeightKg,
    targetWeightKg: input.targetWeightKg,
    startDate: (input.startDate ?? new Date()).toISOString(),
    estimatedWeeks: estimateWeeksToGoal(input.startWeightKg, input.targetWeightKg, paceKgPerWeek),
  }
}

export function buildGoalStateFromPlan(
  plan: NutritionPlan,
  input: {
    goal: FitnessGoal
    pace: GoalPace
    startWeightKg: number
    startDate?: Date
  },
): GoalState {
  return buildGoalState({
    goal: input.goal,
    pace: input.pace,
    startWeightKg: input.startWeightKg,
    targetWeightKg: plan.targetWeight,
    startDate: input.startDate,
  })
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function resolveNumber(value: number | null | undefined, fallback: number | null = null): number | null {
  if (value == null || Number.isNaN(value)) return fallback
  return value
}

/**
 * Reconstruct a GoalState from a profile document, with sensible fallbacks for
 * legacy rows that only have target_weight / weekly_deficit / goal_plain.
 */
export function resolveGoalState(profile: ProfileDocument | null | undefined): GoalState | null {
  if (!profile) return null

  const weight = resolveNumber(profile.weight)
  if (weight == null) return null

  const targetWeight =
    resolveNumber(profile.goal_target_weight_kg) ??
    resolveNumber(profile.target_weight) ??
    weight

  const startWeight = resolveNumber(profile.goal_start_weight_kg) ?? weight

  let type: FitnessGoal | null = profile.goal_type ?? null
  if (!type && profile.target_weight != null && profile.weight != null) {
    const diff = profile.target_weight - profile.weight
    if (diff < -0.1) type = 'lose'
    else if (diff > 0.1) type = 'gain'
    else type = 'maintain'
  }
  if (!type) type = 'maintain'

  let paceKgPerWeek = profile.goal_pace_kg_per_week ?? null
  if (paceKgPerWeek == null && profile.weekly_deficit != null) {
    paceKgPerWeek = profile.weekly_deficit / CALORIES_PER_KG_FAT
  }
  if (paceKgPerWeek == null) {
    paceKgPerWeek = 0
  }

  const startDate = parseIsoDate(profile.goal_start_date) ?? new Date(profile.$createdAt ?? Date.now())

  return {
    type,
    paceKgPerWeek,
    startWeightKg: startWeight,
    targetWeightKg: targetWeight,
    startDate: startDate.toISOString(),
    estimatedWeeks: resolveNumber(profile.goal_estimated_weeks) ?? estimateWeeksToGoal(startWeight, targetWeight, paceKgPerWeek),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function wholeWeeksBetween(start: Date, end: Date): number {
  const msPerWeek = 1000 * 60 * 60 * 24 * 7
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerWeek))
}

export function calculateGoalProgress(
  profile: ProfileDocument | null | undefined,
  referenceDate: Date = new Date(),
): GoalProgress | null {
  const goal = resolveGoalState(profile)
  if (!goal) return null

  const currentWeightKg = profile?.weight ?? goal.startWeightKg
  const elapsedWeeks = wholeWeeksBetween(new Date(goal.startDate), referenceDate)
  const totalChange = goal.targetWeightKg - goal.startWeightKg
  const currentChange = currentWeightKg - goal.startWeightKg
  const progress = totalChange === 0 ? 0 : clamp(currentChange / totalChange, 0, 1)

  let expectedWeightKg = currentWeightKg
  let isOnTrack: boolean | null = null
  let weeksRemaining: number | null = null

  if (goal.paceKgPerWeek !== 0) {
    expectedWeightKg = goal.startWeightKg + goal.paceKgPerWeek * elapsedWeeks
    const deviationKg = Math.abs(currentWeightKg - expectedWeightKg)
    const oneWeekTolerance = Math.abs(goal.paceKgPerWeek)
    isOnTrack = deviationKg <= oneWeekTolerance
    weeksRemaining = estimateWeeksToGoal(currentWeightKg, goal.targetWeightKg, goal.paceKgPerWeek)
  }

  return {
    progress,
    currentWeightKg,
    startWeightKg: goal.startWeightKg,
    targetWeightKg: goal.targetWeightKg,
    paceKgPerWeek: goal.paceKgPerWeek,
    elapsedWeeks,
    estimatedWeeks: goal.estimatedWeeks,
    weeksRemaining,
    expectedWeightKg,
    isOnTrack,
  }
}

export function formatGoalProgress(
  progress: GoalProgress | null,
  formatWeight: (kg: number) => string,
): GoalSummary {
  if (!progress) {
    return {
      label: 'Set a goal to track progress',
      targetWeightDisplay: null,
      paceDisplay: null,
      progressDisplay: null,
      weeksDisplay: null,
    }
  }

  const progressDisplay = `${Math.round(progress.progress * 100)}%`

  if (progress.startWeightKg === progress.targetWeightKg) {
    return {
      label: 'Maintaining weight',
      targetWeightDisplay: `Target ${formatWeight(progress.targetWeightKg)}`,
      paceDisplay: 'Steady maintenance',
      progressDisplay,
      weeksDisplay: null,
    }
  }

  const losing = progress.targetWeightKg < progress.startWeightKg
  const absPace = Math.abs(progress.paceKgPerWeek)
  const paceDisplay = absPace > 0 ? `~${absPace.toFixed(2)} kg/week` : 'On maintenance pace'
  const weeksDisplay = progress.weeksRemaining == null ? null : `${progress.weeksRemaining} week${progress.weeksRemaining === 1 ? '' : 's'} left`

  return {
    label: losing ? 'Losing weight' : 'Building weight',
    targetWeightDisplay: `${formatWeight(progress.currentWeightKg)} → ${formatWeight(progress.targetWeightKg)}`,
    paceDisplay,
    progressDisplay,
    weeksDisplay,
  }
}

export { GOAL_PACE_KG_PER_WEEK }
