import type { CreateMealInput, MealType } from './meals'
import { scaleNutrient } from './servings'

function getNestedValue(data: Record<string, unknown>, key: string): unknown {
  if (key in data) return data[key]

  const nutriments = data.nutriments
  if (nutriments && typeof nutriments === 'object' && !Array.isArray(nutriments)) {
    const n = nutriments as Record<string, unknown>
    if (key in n) return n[key]
    if (key === 'calories' && 'energy-kcal' in n) return n['energy-kcal']
    if (key === 'calories' && 'energy_kcal' in n) return n.energy_kcal
    if (key === 'protein' && 'proteins' in n) return n.proteins
    if (key === 'carbs' && 'carbohydrates' in n) return n.carbohydrates
  }

  return undefined
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function roundInt(value: number | null): number | null {
  if (value == null) return null
  return Math.round(value)
}

export function inferMealTypeFromTime(reference = new Date()): MealType {
  const hour = reference.getHours()
  if (hour < 11) return 'Breakfast'
  if (hour < 15) return 'Lunch'
  if (hour < 20) return 'Dinner'
  return 'Snack'
}

function nutriscoreToDensity(grade: unknown): number | null {
  if (typeof grade !== 'string') return null
  const map: Record<string, number> = { a: 90, b: 70, c: 50, d: 30, e: 10 }
  return map[grade.trim().toLowerCase()] ?? null
}

/** Map barcode / fuzzy API product JSON → Appwrite meal fields. */
export function buildMealInputFromProduct(
  ownerId: string,
  data: Record<string, unknown>,
  mealType: MealType = inferMealTypeFromTime(),
  barcode?: string | null,
  servings = 1,
): CreateMealInput {
  const kcal =
    roundInt(parseNumber(getNestedValue(data, 'calories'))) ??
    roundInt(parseNumber(getNestedValue(data, 'energy-kcal'))) ??
    roundInt(parseNumber(getNestedValue(data, 'energy_kcal')))

  const protein =
    roundInt(parseNumber(getNestedValue(data, 'protein'))) ??
    roundInt(parseNumber(getNestedValue(data, 'proteins')))

  const carbs =
    roundInt(parseNumber(getNestedValue(data, 'carbs'))) ??
    roundInt(parseNumber(getNestedValue(data, 'carbohydrates')))

  const fat = roundInt(parseNumber(getNestedValue(data, 'fat')))

  const nutriscore =
    getNestedValue(data, 'nutriscore_grade') ?? getNestedValue(data, 'nutriscore')

  const trimmedBarcode = barcode?.trim() || null

  return {
    owner: ownerId,
    friendlyname: mealType,
    type: mealType,
    kcal: scaleNutrient(kcal, servings),
    protein: scaleNutrient(protein, servings),
    carbs: scaleNutrient(carbs, servings),
    fat: scaleNutrient(fat, servings),
    nutrient_density_score: nutriscoreToDensity(nutriscore),
    fluid: null,
    items: trimmedBarcode ? [trimmedBarcode] : null,
  }
}
