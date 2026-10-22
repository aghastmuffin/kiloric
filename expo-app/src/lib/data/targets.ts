import { calculateDailyCalories, calculateMacros, NUTRITION_FORMULA_VERSION } from '@/lib/nutrition'
import { loadPlanPreferences, savePlanPreferences } from '@/lib/planPreferences'
import { saveProfileFields } from '@/lib/profile'
import type { ProfileSummary } from './overview'

export type RetargetResult = { tdee: number; targetKcal: number; protein: number; carbs: number; fat: number }

/** Targets the user's goal produces from a given maintenance estimate. */
export function targetsFromTdee(summary: ProfileSummary, tdee: number): RetargetResult {
  const { plan, profile } = summary
  const weightKg = summary.currentWeightKg ?? profile?.weight ?? 70
  const targetKcal = calculateDailyCalories(tdee, plan.goal, plan.pace, plan.sex, weightKg)
  const macros = calculateMacros(targetKcal, weightKg, plan.diet, {
    goal: plan.goal,
    heightCm: profile?.height ?? null,
    bodyFatPct: plan.bodyFatPct,
  })
  return { tdee, targetKcal, ...macros }
}

/** Adopt an adaptive maintenance estimate: rewrites TDEE, calorie and macro targets. */
export async function applyMaintenanceEstimate(userId: string, summary: ProfileSummary, tdee: number): Promise<RetargetResult> {
  const next = targetsFromTdee(summary, tdee)
  await saveProfileFields(userId, {
    TDEE: next.tdee,
    target_kcal: next.targetKcal,
    target_protein: next.protein,
    target_carbs: next.carbs,
    target_fat: next.fat,
    weekly_deficit: (next.tdee - next.targetKcal) * 7,
    formula_version: NUTRITION_FORMULA_VERSION,
  })
  const prefs = await loadPlanPreferences(userId)
  await savePlanPreferences(
    {
      ...prefs,
      overrides: {
        ...prefs.overrides,
        targetKcal: next.targetKcal,
        macroGrams: { protein: next.protein, carbs: next.carbs, fat: next.fat },
      },
    },
    userId,
  )
  return next
}
