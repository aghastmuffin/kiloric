import { MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals'
import { DEFAULT_SERVINGS } from '@/lib/servings'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@calcount/meal_barcodes'

export type MealItemEntry = {
  barcode: string
  servings: number
}

export type MealBarcodesStore = Record<MealType, MealItemEntry[]>

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

export async function loadMealBarcodes(): Promise<MealBarcodesStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    return normalizeStore(JSON.parse(raw))
  } catch (err) {
    console.error('[mealItemsStorage] load failed', err)
    return emptyStore()
  }
}

export async function appendMealBarcode(
  type: MealType,
  barcode: string,
  servings: number = DEFAULT_SERVINGS,
): Promise<MealBarcodesStore> {
  const trimmed = barcode.trim()
  if (!trimmed) return loadMealBarcodes()

  const store = await loadMealBarcodes()
  store[type] = [...store[type], { barcode: trimmed, servings }]

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (err) {
    console.error('[mealItemsStorage] save failed', err)
  }

  return store
}

export async function clearMealBarcodes(): Promise<MealBarcodesStore> {
  const store = emptyStore()
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
    store[type] = items
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (err) {
      console.error('[mealItemsStorage] remove failed', err)
    }
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
  store[type] = items

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (err) {
    console.error('[mealItemsStorage] update servings failed', err)
  }

  return store
}
