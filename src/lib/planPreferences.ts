import { account } from './appwrite'
import {
  DIET_MACRO_PERCENTAGES,
  isValidBodyFatPct,
  NUTRITION_FORMULA_VERSION,
  type ActivityLevel,
  type DietStyle,
  type FitnessGoal,
  type GoalPace,
  type Sex,
} from './nutrition'
import { MEAL_TYPE_OPTIONS, type MealType } from './meals'
import type { DisplayUnits } from './units'
import type { Models } from 'react-native-appwrite'

export type MealSlotPreference = {
  key: MealType
  name: string
  enabled: boolean
  order: number
}

export type NutritionOverrides = {
  targetKcal?: number
  macroGrams?: {
    protein: number
    carbs: number
    fat: number
  }
  dailyFluid?: number
}

export type PlanPreferences = {
  version: number
  sex: Sex
  activity: ActivityLevel
  goal: FitnessGoal
  pace: GoalPace
  diet: DietStyle
  targetWeightKg: number | null
  bodyFatPct: number | null
  displayUnits: DisplayUnits
  overrides: NutritionOverrides
  mealSlots: MealSlotPreference[]
}

const PREFS_KEY = 'kiloricPlan'
const LEGACY_PREFS_KEY = 'calcountPlan'

export function defaultMealSlots(): MealSlotPreference[] {
  return MEAL_TYPE_OPTIONS.map((key, order) => ({
    key,
    name: key,
    enabled: key !== 'Other',
    order,
  }))
}

export function createDefaultPlanPreferences(): PlanPreferences {
  return {
    version: NUTRITION_FORMULA_VERSION,
    sex: 'female',
    activity: 'moderate',
    goal: 'lose',
    pace: 'moderate',
    diet: 'balanced',
    targetWeightKg: null,
    bodyFatPct: null,
    displayUnits: 'metric',
    overrides: {},
    mealSlots: defaultMealSlots(),
  }
}

function finiteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function normalizeSlots(value: unknown): MealSlotPreference[] {
  if (!Array.isArray(value)) return defaultMealSlots()
  const byKey = new Map<MealType, MealSlotPreference>()
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return
    const raw = entry as Partial<MealSlotPreference>
    if (!MEAL_TYPE_OPTIONS.includes(raw.key as MealType)) return
    const key = raw.key as MealType
    byKey.set(key, {
      key,
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim().slice(0, 32)
          : key,
      enabled: raw.enabled !== false,
      order: finiteInRange(raw.order, 0, 100) ? raw.order : index,
    })
  })
  const merged = defaultMealSlots().map((slot) => byKey.get(slot.key) ?? slot)
  merged.sort((a, b) => a.order - b.order)
  if (!merged.some((slot) => slot.enabled)) merged[0].enabled = true
  return merged.map((slot, order) => ({ ...slot, order }))
}

export function normalizePlanPreferences(value: unknown): PlanPreferences {
  const defaults = createDefaultPlanPreferences()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const raw = value as Partial<PlanPreferences>
  const overrides = raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {}
  const targetKcal = finiteInRange(overrides.targetKcal, 800, 6000)
    ? Math.round(overrides.targetKcal)
    : undefined
  const dailyFluid = finiteInRange(overrides.dailyFluid, 250, 8000)
    ? Math.round(overrides.dailyFluid)
    : undefined
  const grams = overrides.macroGrams
  const macroGrams =
    grams &&
    finiteInRange(grams.protein, 0, 500) &&
    finiteInRange(grams.carbs, 0, 1000) &&
    finiteInRange(grams.fat, 0, 500)
      ? {
          protein: Math.round(grams.protein),
          carbs: Math.round(grams.carbs),
          fat: Math.round(grams.fat),
        }
      : undefined

  return {
    version: NUTRITION_FORMULA_VERSION,
    sex: raw.sex === 'male' ? 'male' : 'female',
    activity: ['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(
      raw.activity ?? '',
    )
      ? (raw.activity as ActivityLevel)
      : defaults.activity,
    goal: ['lose', 'maintain', 'gain'].includes(raw.goal ?? '')
      ? (raw.goal as FitnessGoal)
      : defaults.goal,
    pace: ['gentle', 'moderate', 'aggressive'].includes(raw.pace ?? '')
      ? (raw.pace as GoalPace)
      : defaults.pace,
    diet: Object.hasOwn(DIET_MACRO_PERCENTAGES, raw.diet ?? '')
      ? (raw.diet as DietStyle)
      : defaults.diet,
    targetWeightKg: finiteInRange(raw.targetWeightKg, 30, 500) ? raw.targetWeightKg : null,
    bodyFatPct: isValidBodyFatPct(raw.bodyFatPct) ? Math.round(raw.bodyFatPct * 10) / 10 : null,
    displayUnits: raw.displayUnits === 'imperial' ? 'imperial' : 'metric',
    overrides: { targetKcal, dailyFluid, macroGrams },
    mealSlots: normalizeSlots(raw.mealSlots),
  }
}

export function planPreferencesFromUser(
  user: Models.User<Models.Preferences>,
): PlanPreferences {
  const prefs = user.prefs as Record<string, unknown>
  return normalizePlanPreferences(prefs[PREFS_KEY] ?? prefs[LEGACY_PREFS_KEY])
}

export async function loadPlanPreferences(
  expectedUserId?: string,
): Promise<PlanPreferences> {
  const user = await account.get()
  if (expectedUserId && user.$id !== expectedUserId) {
    throw new Error('Unauthorized: You are not permitted to modify preferences for another user.')
  }
  return planPreferencesFromUser(user)
}

export async function savePlanPreferences(
  preferences: PlanPreferences,
  expectedUserId?: string,
): Promise<PlanPreferences> {
  const normalized = normalizePlanPreferences(preferences)
  const user = await account.get()
  if (expectedUserId && user.$id !== expectedUserId) {
    throw new Error('Unauthorized: You are not permitted to modify preferences for another user.')
  }
  await account.updatePrefs({
    prefs: {
      ...(user.prefs as Record<string, unknown>),
      [PREFS_KEY]: normalized,
      [LEGACY_PREFS_KEY]: normalized,
    },
  })
  return normalized
}

export function effectiveMealSlots(preferences: PlanPreferences): MealSlotPreference[] {
  return preferences.mealSlots.filter((slot) => slot.enabled).sort((a, b) => a.order - b.order)
}
