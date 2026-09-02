import { DEFAULT_SERVINGS } from './servings'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const MEAL_TYPE_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'] as const
export type MealType = (typeof MEAL_TYPE_OPTIONS)[number]

const STORAGE_KEY = '@calcount/meal_barcodes'

// In-memory cache for meal barcodes store to eliminate redundant AsyncStorage reads and JSON parsing.
let mealBarcodesCache: MealBarcodesStore | null = null
let inflightLoadMealBarcodes: Promise<MealBarcodesStore> | null = null

export type MealItemEntry = {
  barcode: string
  servings: number
}

export type MealBarcodesStore = Record<MealType, MealItemEntry[]>

/** Clear in-memory meal barcodes cache to prevent stale state across sessions or tests. */
export function clearMealBarcodesCache(): void {
  mealBarcodesCache = null
  inflightLoadMealBarcodes = null
}

function emptyStore(): MealBarcodesStore {
  return {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snack: [],
    Other: [],
  }
}

function normalizeEntry(raw: unknown): MealItemEntry | null {
  if (typeof raw === 'string') {
    const barcode = raw.trim()
    return barcode ? { barcode, servings: DEFAULT_SERVINGS } : null
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const entry = raw as Record<string, unknown>
  const barcode = typeof entry.barcode === 'string' ? entry.barcode.trim() : ''
  if (!barcode) return null

  const servings =
    typeof entry.servings === 'number' && Number.isFinite(entry.servings) && entry.servings > 0
      ? entry.servings
      : DEFAULT_SERVINGS

  return { barcode, servings }
}

function normalizeStore(raw: unknown): MealBarcodesStore {
  const store = emptyStore()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return store

  for (const type of MEAL_TYPE_OPTIONS) {
    const value = (raw as Record<string, unknown>)[type]
    if (!Array.isArray(value)) continue
    store[type] = value
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is MealItemEntry => entry !== null)
  }

  return store
}

export function loadMealBarcodes(): Promise<MealBarcodesStore> {
  // 1. Return in-memory cache if available
  if (mealBarcodesCache) {
    return Promise.resolve(mealBarcodesCache)
  }

  // 2. Return pending in-flight promise to deduplicate concurrent requests
  if (inflightLoadMealBarcodes) {
    return inflightLoadMealBarcodes
  }

  inflightLoadMealBarcodes = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const store = emptyStore()
        mealBarcodesCache = store
        return store
      }
      const store = normalizeStore(JSON.parse(raw))
      mealBarcodesCache = store
      return store
    } catch (err) {
      console.error('[mealItemsStorage] load failed', err)
      const store = emptyStore()
      mealBarcodesCache = store
      return store
    } finally {
      inflightLoadMealBarcodes = null
    }
  })()

  return inflightLoadMealBarcodes
}

export async function appendMealBarcode(
  type: MealType,
  barcode: string,
  servings: number = DEFAULT_SERVINGS,
): Promise<MealBarcodesStore> {
  const trimmed = barcode.trim()
  if (!trimmed) return loadMealBarcodes()

  const store = await loadMealBarcodes()
  const updatedStore: MealBarcodesStore = {
    ...store,
    [type]: [...store[type], { barcode: trimmed, servings }],
  }

  // Synchronously update memory cache to serve subsequent reads instantly
  mealBarcodesCache = updatedStore

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStore))
  } catch (err) {
    console.error('[mealItemsStorage] save failed', err)
  }

  return updatedStore
}

export async function clearMealBarcodes(): Promise<MealBarcodesStore> {
  const store = emptyStore()
  mealBarcodesCache = store
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (err) {
    console.error('[mealItemsStorage] clear failed', err)
  }
  return store
}

export async function removeMealBarcode(
  type: MealType,
  index: number,
): Promise<MealBarcodesStore> {
  const store = await loadMealBarcodes()
  const items = [...store[type]]
  if (index >= 0 && index < items.length) {
    items.splice(index, 1)
    const updatedStore: MealBarcodesStore = {
      ...store,
      [type]: items,
    }
    mealBarcodesCache = updatedStore
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStore))
    } catch (err) {
      console.error('[mealItemsStorage] remove failed', err)
    }
    return updatedStore
  }
  return store
}

export async function updateMealItemServings(
  type: MealType,
  index: number,
  servings: number,
): Promise<MealBarcodesStore> {
  if (!Number.isFinite(servings) || servings <= 0) return loadMealBarcodes()

  const store = await loadMealBarcodes()
  const items = [...store[type]]
  if (index < 0 || index >= items.length) return store

  items[index] = { ...items[index], servings }
  const updatedStore: MealBarcodesStore = {
    ...store,
    [type]: items,
  }
  mealBarcodesCache = updatedStore

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStore))
  } catch (err) {
    console.error('[mealItemsStorage] update servings failed', err)
  }

  return updatedStore
}
