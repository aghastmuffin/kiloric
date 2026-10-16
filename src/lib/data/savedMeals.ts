import type { MealType } from '@/lib/meals'
import { foodItemFromEntry, logFood, type FoodEntry, type FoodEntryFields } from './foodLog'
import { sumMacros } from './foodItem'
import { createRecordStore, type StoredRecord } from './recordStore'

type SavedMealItem = Pick<
  FoodEntryFields,
  'name' | 'brand' | 'barcode' | 'serving_label' | 'serving_grams' | 'servings' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'meal_type'
>

export type SavedMealFields = {
  name: string
  meal_type: MealType
  items_json: string
  item_count: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type SavedMeal = StoredRecord<SavedMealFields>

export const savedMealsStore = createRecordStore<SavedMealFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_SAVED_MEALS_COLLECTION_ID ?? 'saved_meals',
  fallbackLimit: 30,
  recencyField: '$createdAt',
})

export function parseSavedMealItems(meal: Pick<SavedMealFields, 'items_json' | 'meal_type'>): SavedMealItem[] {
  try {
    const parsed = JSON.parse(meal.items_json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is SavedMealItem => !!item && typeof item.name === 'string')
      .map((item) => ({ ...item, meal_type: item.meal_type ?? meal.meal_type }))
  } catch {
    return []
  }
}

export function listSavedMeals(userId: string): Promise<SavedMeal[]> {
  return savedMealsStore.list(userId, [], { orderBy: 'name', limit: 100 })
}

export async function saveMealFromEntries(
  userId: string,
  name: string,
  mealType: MealType,
  entries: readonly FoodEntry[],
): Promise<SavedMeal> {
  const trimmed = name.trim().slice(0, 128)
  if (!trimmed) throw new Error('Give the meal a name.')
  if (entries.length === 0) throw new Error('Log at least one food before saving a meal.')
  const items: SavedMealItem[] = entries.map((entry) => ({
    name: entry.name,
    brand: entry.brand ?? null,
    barcode: entry.barcode ?? null,
    serving_label: entry.serving_label ?? null,
    serving_grams: entry.serving_grams ?? null,
    servings: entry.servings,
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    meal_type: mealType,
  }))
  const totals = sumMacros(items)
  return savedMealsStore.create(userId, {
    name: trimmed,
    meal_type: mealType,
    items_json: JSON.stringify(items),
    item_count: items.length,
    kcal: totals.kcal,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  })
}

export async function logSavedMeal(userId: string, meal: SavedMeal, mealType: MealType): Promise<void> {
  for (const item of parseSavedMealItems(meal)) {
    const entryLike = { ...item, day: '', logged_at: '' } as FoodEntryFields
    await logFood(userId, {
      item: foodItemFromEntry(entryLike),
      servings: item.servings > 0 ? item.servings : 1,
      mealType,
      source: 'saved_meal',
    })
  }
}

export function deleteSavedMeal(userId: string, mealId: string): Promise<void> {
  return savedMealsStore.remove(userId, mealId)
}
