import { databases } from '@/lib/appwrite'
import {
  clearTodayMealsCache,
  createMeal,
  getMeal,
  getTodayMeals,
  MEALS_COLLECTION_ID,
  updateMeal,
  type MealDocument,
  type MealType,
} from '@/lib/meals'
import { Query, type Models } from 'react-native-appwrite'
import { dayKey } from './dateKeys'
import { scaleMacros, sumMacros, type FoodItem, type Macros } from './foodItem'
import { assertSessionUser, createRecordStore, type StoredRecord } from './recordStore'

export const LOG_MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const satisfies readonly MealType[]
export type LogMealType = (typeof LOG_MEAL_TYPES)[number]

export type FoodEntrySource = 'scan' | 'search' | 'recent' | 'plan' | 'saved_meal'

export type FoodEntryFields = {
  meal_type: MealType
  name: string
  brand?: string | null
  barcode?: string | null
  serving_label?: string | null
  serving_grams?: number | null
  servings: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  day: string
  logged_at: string
  source?: FoodEntrySource | null
  meal_doc_id?: string | null
}

export type FoodEntry = StoredRecord<FoodEntryFields>

export const foodEntriesStore = createRecordStore<FoodEntryFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_FOOD_ENTRIES_COLLECTION_ID ?? 'food_entries',
  fallbackLimit: 120,
  recencyField: 'logged_at',
})

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? ''

export function entryMacros(entry: Pick<FoodEntryFields, 'kcal' | 'protein' | 'carbs' | 'fat'>): Macros {
  return { kcal: entry.kcal ?? 0, protein: entry.protein ?? 0, carbs: entry.carbs ?? 0, fat: entry.fat ?? 0 }
}

/** Rebuild a loggable FoodItem from a previously logged entry. */
export function foodItemFromEntry(entry: FoodEntryFields): FoodItem {
  const servings = entry.servings > 0 ? entry.servings : 1
  return {
    name: entry.name,
    brand: entry.brand ?? null,
    barcode: entry.barcode ?? null,
    servingGrams: entry.serving_grams && entry.serving_grams > 0 ? entry.serving_grams : 100,
    servingLabel: entry.serving_label ?? '1 serving',
    perServing: scaleMacros(entryMacros(entry), 1 / servings),
  }
}

function foodKey(entry: Pick<FoodEntryFields, 'name' | 'brand' | 'barcode'>): string {
  return (entry.barcode?.trim() || `${entry.name}|${entry.brand ?? ''}`).toLowerCase()
}

/** Most recently logged distinct foods. */
export function recentFoods(entries: readonly FoodEntry[], limit = 8): FoodEntry[] {
  const seen = new Set<string>()
  const result: FoodEntry[] = []
  const sorted = [...entries].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  for (const entry of sorted) {
    const key = foodKey(entry)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(entry)
    if (result.length >= limit) break
  }
  return result
}

/** Foods logged most often, newest entry kept as the representative. */
export function frequentFoods(entries: readonly FoodEntry[], limit = 8): { entry: FoodEntry; count: number }[] {
  const byKey = new Map<string, { entry: FoodEntry; count: number }>()
  for (const entry of entries) {
    const key = foodKey(entry)
    const current = byKey.get(key)
    if (!current) {
      byKey.set(key, { entry, count: 1 })
      continue
    }
    current.count += 1
    if (entry.logged_at > current.entry.logged_at) current.entry = entry
  }
  return [...byKey.values()]
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count || b.entry.logged_at.localeCompare(a.entry.logged_at))
    .slice(0, limit)
}

export function mealTotals(meals: readonly MealDocument[]): Macros {
  return sumMacros(
    meals.map((meal) => ({
      kcal: meal.kcal ?? 0,
      protein: meal.protein ?? 0,
      carbs: meal.carbs ?? 0,
      fat: meal.fat ?? 0,
    })),
  )
}

async function addToMealBucket(userId: string, mealType: MealType, macros: Macros, barcode: string | null): Promise<MealDocument> {
  const todayMeals = await getTodayMeals(userId)
  const existing = todayMeals.find((meal) => meal.type === mealType)
  if (existing) {
    const items = barcode ? [...(existing.items ?? []), barcode] : existing.items ?? null
    return updateMeal(existing.$id, {
      friendlyname: mealType,
      kcal: (existing.kcal ?? 0) + macros.kcal,
      protein: (existing.protein ?? 0) + macros.protein,
      carbs: (existing.carbs ?? 0) + macros.carbs,
      fat: (existing.fat ?? 0) + macros.fat,
      items,
    })
  }
  return createMeal({
    owner: userId,
    friendlyname: mealType,
    type: mealType,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    items: barcode ? [barcode] : null,
  })
}

/**
 * Log a food: adds it to today's `meals` bucket for the meal type (which drives
 * totals and history) and records the item in `food_entries` (which drives the
 * Recent / Frequent lists and the per-item food log).
 */
export async function logFood(
  userId: string,
  input: { item: FoodItem; servings: number; mealType: MealType; source: FoodEntrySource },
): Promise<FoodEntry> {
  await assertSessionUser(userId)
  const servings = Math.max(0, input.servings)
  if (servings <= 0) throw new Error('Choose an amount greater than zero.')
  const macros = scaleMacros(input.item.perServing, servings)
  const mealDoc = await addToMealBucket(userId, input.mealType, macros, input.item.barcode)
  const now = new Date()
  const entry = await foodEntriesStore.create(userId, {
    meal_type: input.mealType,
    name: input.item.name.slice(0, 256),
    brand: input.item.brand?.slice(0, 256) ?? null,
    barcode: input.item.barcode?.slice(0, 64) ?? null,
    serving_label: input.item.servingLabel.slice(0, 128),
    serving_grams: input.item.servingGrams,
    servings: Math.round(servings * 100) / 100,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    day: dayKey(now),
    logged_at: now.toISOString(),
    source: input.source,
    meal_doc_id: mealDoc.$id,
  })
  clearTodayMealsCache(userId)
  return entry
}

export async function removeFoodEntry(userId: string, entry: FoodEntry): Promise<void> {
  await assertSessionUser(userId)
  if (entry.meal_doc_id) {
    const meal = await getMeal(entry.meal_doc_id).catch(() => null)
    if (meal) {
      const items = [...(meal.items ?? [])]
      if (entry.barcode) {
        const index = items.indexOf(entry.barcode)
        if (index >= 0) items.splice(index, 1)
      }
      await updateMeal(meal.$id, {
        kcal: Math.max(0, (meal.kcal ?? 0) - entry.kcal),
        protein: Math.max(0, (meal.protein ?? 0) - entry.protein),
        carbs: Math.max(0, (meal.carbs ?? 0) - entry.carbs),
        fat: Math.max(0, (meal.fat ?? 0) - entry.fat),
        items: items.length > 0 ? items : null,
      })
    }
  }
  await foodEntriesStore.remove(userId, entry.$id)
  clearTodayMealsCache(userId)
}

export function listEntriesForDay(userId: string, day: string = dayKey()): Promise<FoodEntry[]> {
  return foodEntriesStore.list(userId, [{ field: 'day', op: 'eq', value: day }], {
    orderBy: 'logged_at',
    desc: false,
    limit: 200,
  })
}

export function listRecentEntries(userId: string, limit = 120): Promise<FoodEntry[]> {
  return foodEntriesStore.list(userId, [], { orderBy: 'logged_at', desc: true, limit })
}

const MEALS_PAGE_SIZE = 500
const MEALS_MAX_PAGES = 10

/** All `meals` buckets created on or after `since`, oldest first (used for charts and streaks). */
export async function listMealsSince(userId: string, since: Date): Promise<MealDocument[]> {
  await assertSessionUser(userId)
  if (!DATABASE_ID || !MEALS_COLLECTION_ID) return []
  const documents: MealDocument[] = []
  let cursor: string | null = null
  for (let page = 0; page < MEALS_MAX_PAGES; page += 1) {
    const response: Models.DocumentList<MealDocument> = await databases.listDocuments<MealDocument>({
      databaseId: DATABASE_ID,
      collectionId: MEALS_COLLECTION_ID,
      queries: [
        Query.equal('owner', userId),
        Query.greaterThanEqual('$createdAt', since.toISOString()),
        Query.orderDesc('$createdAt'),
        Query.limit(MEALS_PAGE_SIZE),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    })
    documents.push(...response.documents)
    if (response.documents.length < MEALS_PAGE_SIZE) break
    cursor = response.documents[response.documents.length - 1].$id
  }
  return documents.reverse()
}

/** Total kcal per local day from meal buckets. */
export function dailyKcalByDay(meals: readonly MealDocument[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const meal of meals) {
    const key = dayKey(new Date(meal.$createdAt))
    totals.set(key, (totals.get(key) ?? 0) + (meal.kcal ?? 0))
  }
  return totals
}

/** Consecutive days with at least one logged meal, counting back from today (or yesterday if today is empty). */
export function loggingStreak(loggedDays: ReadonlySet<string>, today: Date = new Date()): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!loggedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (loggedDays.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
