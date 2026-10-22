import {
  ACTIVITY_MULTIPLIERS,
  DIET_MACRO_PERCENTAGES,
  isValidBodyFatPct,
  type ActivityLevel,
  type DietStyle,
  type FitnessGoal,
  type GoalPace,
  type Sex,
} from './nutrition'
import type { PlanPreferences } from './planPreferences'
import type { ProfileFields } from './profile'

/** Everything the energy and macro formulas need, resolved from profile columns then prefs. */
export type PlanInputs = {
  sex: Sex
  activity: ActivityLevel
  goal: FitnessGoal
  pace: GoalPace
  diet: DietStyle
  bodyFatPct: number | null
  tdee: number | null
}

const PACES: readonly GoalPace[] = ['gentle', 'moderate', 'aggressive']
const GOALS: readonly FitnessGoal[] = ['lose', 'maintain', 'gain']

export function resolvePlanInputs(
  profile: Partial<ProfileFields> | null | undefined,
  prefs: PlanPreferences | null | undefined,
): PlanInputs {
  const activity =
    profile?.activity_level && Object.hasOwn(ACTIVITY_MULTIPLIERS, profile.activity_level)
      ? profile.activity_level
      : (prefs?.activity ?? 'moderate')
  const diet =
    profile?.diet_style && Object.hasOwn(DIET_MACRO_PERCENTAGES, profile.diet_style)
      ? profile.diet_style
      : (prefs?.diet ?? 'balanced')
  const bodyFatPct = isValidBodyFatPct(profile?.body_fat_pct)
    ? profile.body_fat_pct
    : isValidBodyFatPct(prefs?.bodyFatPct)
      ? prefs.bodyFatPct
      : null
  return {
    sex: profile?.sex === 'male' || profile?.sex === 'female' ? profile.sex : (prefs?.sex ?? 'female'),
    activity,
    goal: profile?.goal_type && GOALS.includes(profile.goal_type) ? profile.goal_type : (prefs?.goal ?? 'maintain'),
    pace: profile?.goal_pace && PACES.includes(profile.goal_pace) ? profile.goal_pace : (prefs?.pace ?? 'moderate'),
    diet,
    bodyFatPct,
    tdee: typeof profile?.TDEE === 'number' && profile.TDEE > 0 ? profile.TDEE : null,
  }
}
