import type { MealType } from '@/lib/meals'
import { dayKey, weekDayKeys } from './dateKeys'
import { logFood, type FoodEntry } from './foodLog'
import { sumMacros, type FoodItem, type Macros } from './foodItem'
import { createRecordStore, type StoredRecord } from './recordStore'
import type { SavedMeal } from './savedMeals'

export const PLAN_MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const satisfies readonly MealType[]

export type PlanEntryFields = {
  day: string
  meal_type: MealType
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  prepped: boolean
  logged: boolean
  note?: string | null
  serving_label?: string | null
}

export type PlanEntry = StoredRecord<PlanEntryFields>

export type PrepItem = { name: string; portions: number }

export type PrepSessionFields = {
  week_start: string
  scheduled_at: string
  duration_min: number
  title: string
  items_json: string
}

export type PrepSession = StoredRecord<PrepSessionFields>

export type GroceryItemFields = {
  week_start: string
  name: string
  quantity?: string | null
  checked: boolean
}

export type GroceryItem = StoredRecord<GroceryItemFields>

export const planEntriesStore = createRecordStore<PlanEntryFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_PLAN_ENTRIES_COLLECTION_ID ?? 'meal_plan_entries',
  fallbackLimit: 70,
  recencyField: 'day',
})

export const prepSessionsStore = createRecordStore<PrepSessionFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_PREP_SESSIONS_COLLECTION_ID ?? 'prep_sessions',
  fallbackLimit: 8,
  recencyField: 'week_start',
})

export const groceryItemsStore = createRecordStore<GroceryItemFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_GROCERY_ITEMS_COLLECTION_ID ?? 'grocery_items',
  fallbackLimit: 60,
  recencyField: 'week_start',
})

const MEAL_ORDER: Record<string, number> = { Breakfast: 0, Lunch: 1, Snack: 2, Dinner: 3, Other: 4 }

export function sortPlanEntries<T extends Pick<PlanEntryFields, 'meal_type' | 'day'>>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) => a.day.localeCompare(b.day) || (MEAL_ORDER[a.meal_type] ?? 9) - (MEAL_ORDER[b.meal_type] ?? 9),
  )
}

export function listPlanEntries(userId: string, fromDay: string, toDay: string): Promise<PlanEntry[]> {
  return planEntriesStore
    .list(
      userId,
      [
        { field: 'day', op: 'gte', value: fromDay },
        { field: 'day', op: 'lte', value: toDay },
      ],
      { orderBy: 'day', limit: 200 },
    )
    .then(sortPlanEntries)
}

export function addPlanEntry(userId: string, data: Omit<PlanEntryFields, 'logged'> & { logged?: boolean }): Promise<PlanEntry> {
  return planEntriesStore.create(userId, {
    ...data,
    name: data.name.trim().slice(0, 128),
    kcal: Math.max(0, Math.round(data.kcal)),
    logged: data.logged ?? false,
  })
}

export function updatePlanEntry(userId: string, id: string, patch: Partial<PlanEntryFields>): Promise<PlanEntry> {
  return planEntriesStore.update(userId, id, patch)
}

export function deletePlanEntry(userId: string, id: string): Promise<void> {
  return planEntriesStore.remove(userId, id)
}

export function planEntryFoodItem(entry: PlanEntryFields): FoodItem {
  return {
    name: entry.name,
    brand: null,
    barcode: null,
    servingGrams: 100,
    servingLabel: entry.serving_label ?? '1 portion',
    perServing: { kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat },
  }
}

/** Checking a plan item logs it to today's food log; unchecking only clears the plan flag. */
export async function setPlanEntryLogged(userId: string, entry: PlanEntry, logged: boolean): Promise<PlanEntry> {
  if (logged && !entry.logged) {
    await logFood(userId, { item: planEntryFoodItem(entry), servings: 1, mealType: entry.meal_type, source: 'plan' })
  }
  return planEntriesStore.update(userId, entry.$id, { logged })
}

export function plannedTotals(entries: readonly PlanEntryFields[]): Macros {
  return sumMacros(entries)
}

export function parsePrepItems(session: Pick<PrepSessionFields, 'items_json'> | null | undefined): PrepItem[] {
  if (!session) return []
  try {
    const parsed = JSON.parse(session.items_json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is PrepItem => !!item && typeof item.name === 'string')
      .map((item) => ({ name: item.name, portions: Math.max(0, Math.round(Number(item.portions) || 0)) }))
  } catch {
    return []
  }
}

export async function getPrepSession(userId: string, weekStart: string): Promise<PrepSession | null> {
  const sessions = await prepSessionsStore.list(userId, [{ field: 'week_start', op: 'eq', value: weekStart }], { limit: 1 })
  return sessions[0] ?? null
}

export async function savePrepSession(
  userId: string,
  existing: PrepSession | null,
  data: { weekStart: string; scheduledAt: Date; durationMin: number; title: string; items: PrepItem[] },
): Promise<PrepSession> {
  const payload: PrepSessionFields = {
    week_start: data.weekStart,
    scheduled_at: data.scheduledAt.toISOString(),
    duration_min: Math.max(0, Math.round(data.durationMin)),
    title: data.title.trim().slice(0, 64) || 'Meal prep',
    items_json: JSON.stringify(data.items.filter((item) => item.name.trim()).slice(0, 20)),
  }
  if (existing) return prepSessionsStore.update(userId, existing.$id, payload)
  return prepSessionsStore.create(userId, payload)
}

export function listGroceryItems(userId: string, weekStart: string): Promise<GroceryItem[]> {
  return groceryItemsStore.list(userId, [{ field: 'week_start', op: 'eq', value: weekStart }], {
    orderBy: 'name',
    limit: 200,
  })
}

export function addGroceryItem(userId: string, weekStart: string, name: string, quantity?: string): Promise<GroceryItem> {
  const trimmed = name.trim().slice(0, 128)
  if (!trimmed) throw new Error('Enter an item name.')
  return groceryItemsStore.create(userId, {
    week_start: weekStart,
    name: trimmed,
    quantity: quantity?.trim().slice(0, 64) || null,
    checked: false,
  })
}

export function setGroceryChecked(userId: string, id: string, checked: boolean): Promise<GroceryItem> {
  return groceryItemsStore.update(userId, id, { checked })
}

export function deleteGroceryItem(userId: string, id: string): Promise<void> {
  return groceryItemsStore.remove(userId, id)
}

export type PlanCandidate = Pick<PlanEntryFields, 'meal_type' | 'name' | 'kcal' | 'protein' | 'carbs' | 'fat'> & {
  serving_label?: string | null
}

/** Build per-meal-type candidates from the user's saved meals first, then their most-logged foods. */
export function planCandidatesFrom(
  savedMeals: readonly SavedMeal[],
  frequent: readonly { entry: FoodEntry; count: number }[],
  recent: readonly FoodEntry[],
): Map<MealType, PlanCandidate[]> {
  const byType = new Map<MealType, PlanCandidate[]>()
  const seen = new Set<string>()
  const push = (candidate: PlanCandidate) => {
    const key = `${candidate.meal_type}|${candidate.name.toLowerCase()}`
    if (seen.has(key) || candidate.kcal <= 0) return
    seen.add(key)
    const list = byType.get(candidate.meal_type) ?? []
    list.push(candidate)
    byType.set(candidate.meal_type, list)
  }
  for (const meal of savedMeals) {
    push({ meal_type: meal.meal_type, name: meal.name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat })
  }
  for (const { entry } of frequent) {
    push({ ...entry, serving_label: entry.serving_label })
  }
  for (const entry of recent) {
    push({ ...entry, serving_label: entry.serving_label })
  }
  return byType
}

/**
 * Fill empty Breakfast / Lunch / Dinner slots for the remaining days of a week,
 * rotating through the user's own candidates so days don't repeat back-to-back.
 */
export function autofillWeek(
  weekStart: Date,
  existing: readonly Pick<PlanEntryFields, 'day' | 'meal_type'>[],
  candidates: Map<MealType, PlanCandidate[]>,
  today: Date = new Date(),
  slots: readonly MealType[] = ['Breakfast', 'Lunch', 'Dinner'],
): Omit<PlanEntryFields, 'logged'>[] {
  const todayKey = dayKey(today)
  const filled = new Set(existing.map((entry) => `${entry.day}|${entry.meal_type}`))
  const additions: Omit<PlanEntryFields, 'logged'>[] = []
  const cursor = new Map<MealType, number>()
  weekDayKeys(weekStart).forEach((day, dayIndex) => {
    if (day < todayKey) return
    for (const slot of slots) {
      if (filled.has(`${day}|${slot}`)) continue
      const options = candidates.get(slot)
      if (!options || options.length === 0) continue
      const index = (cursor.get(slot) ?? dayIndex) % options.length
      cursor.set(slot, index + 1)
      const choice = options[index]
      additions.push({
        day,
        meal_type: slot,
        name: choice.name,
        kcal: choice.kcal,
        protein: choice.protein,
        carbs: choice.carbs,
        fat: choice.fat,
        prepped: false,
        note: null,
        serving_label: choice.serving_label ?? null,
      })
    }
  })
  return additions
}
