import type {
  ActivityLevel,
  DietStyle,
  FitnessGoal,
  GoalPace,
  Sex,
} from '@/lib/nutrition'
import { guessCountryCode, NUTRITION_FORMULA_VERSION, usernameFromEmail } from '@/lib/nutrition'
import {
  defaultMealSlots,
  type PlanPreferences,
} from '@/lib/planPreferences'
import { defaultDisplayUnits, type DisplayUnits } from '@/lib/units'

export type MacroOverrides = {
  targetKcal: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

export type OnboardingStep =
  | 'email'
  | 'password'
  | 'welcome'
  | 'body'
  | 'lifestyle'
  | 'diet'
  | 'plan'

export const AUTH_ONBOARDING_STEPS: OnboardingStep[] = ['email', 'password']

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'email',
  'password',
  'welcome',
  'body',
  'lifestyle',
  'diet',
  'plan',
]

export function getOnboardingSteps(isAuthenticated: boolean): OnboardingStep[] {
  if (isAuthenticated) {
    return ONBOARDING_STEPS.filter((step) => !AUTH_ONBOARDING_STEPS.includes(step))
  }
  return ONBOARDING_STEPS
}

export type OnboardingFormState = {
  username: string
  dateOfBirth: Date
  country: string
  bio: string
  sex: Sex
  height: number
  weight: number
  activity: ActivityLevel
  goal: FitnessGoal
  pace: GoalPace
  diet: DietStyle
  targetWeight: number | null
  displayUnits: DisplayUnits
  macroOverrides: MacroOverrides | null
}

export const DEFAULT_DATE_OF_BIRTH = new Date(1995, 0, 15)

export function createDefaultFormState(email?: string | null): OnboardingFormState {
  const country = guessCountryCode()
  return {
    username: email ? usernameFromEmail(email) : '',
    dateOfBirth: DEFAULT_DATE_OF_BIRTH,
    country,
    bio: '',
    sex: 'female',
    height: 170,
    weight: 70,
    activity: 'moderate',
    goal: 'lose',
    pace: 'moderate',
    diet: 'balanced',
    targetWeight: null,
    displayUnits: defaultDisplayUnits(country),
    macroOverrides: null,
  }
}

/** Build Auth plan prefs from the wizard form (lifestyle inputs + optional overrides). */
export function planPreferencesFromForm(
  form: OnboardingFormState,
  dailyFluid?: number | null,
): PlanPreferences {
  return {
    version: NUTRITION_FORMULA_VERSION,
    sex: form.sex,
    activity: form.activity,
    goal: form.goal,
    pace: form.pace,
    diet: form.diet,
    targetWeightKg: form.targetWeight,
    displayUnits: form.displayUnits,
    overrides: form.macroOverrides
      ? {
          targetKcal: form.macroOverrides.targetKcal,
          dailyFluid: dailyFluid ?? undefined,
          macroGrams: {
            protein: form.macroOverrides.targetProtein,
            carbs: form.macroOverrides.targetCarbs,
            fat: form.macroOverrides.targetFat,
          },
        }
      : {},
    mealSlots: defaultMealSlots(),
  }
}
