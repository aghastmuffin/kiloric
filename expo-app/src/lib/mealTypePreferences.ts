import { inferMealTypeFromTime } from './mealFromProduct'
import { MEAL_TYPE_OPTIONS, type MealType } from './meals'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@kiloric/selected_meal_type'

export const DEFAULT_MEAL_TYPE: MealType = inferMealTypeFromTime()

// ⚡ Bolt: In-memory cache, request deduplication, and cache generation tracking
// to eliminate redundant AsyncStorage bridge reads and race conditions.
let cachedMealType: MealType | null = null
let inflightPromise: Promise<MealType> | null = null
let cacheGeneration = 0

/** Clear any cached meal type and reset inflight promise to guarantee safe session purges. */
export function clearMealTypePreferencesCache(): void {
  cachedMealType = null
  inflightPromise = null
  cacheGeneration += 1
}

export function loadSelectedMealType(): Promise<MealType> {
  if (cachedMealType !== null) {
    return Promise.resolve(cachedMealType)
  }

  if (inflightPromise !== null) {
    return inflightPromise
  }

  const currentGeneration = cacheGeneration

  const promise = (async () => {
    let result = DEFAULT_MEAL_TYPE
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY)
      if (value && MEAL_TYPE_OPTIONS.includes(value as MealType)) {
        result = value as MealType
      }
    } catch (err) {
      console.error('[mealTypePreferences] load failed', err)
    }

    if (cacheGeneration === currentGeneration) {
      cachedMealType = result
    }
    return result
  })()

  inflightPromise = promise

  promise.finally(() => {
    if (inflightPromise === promise) {
      inflightPromise = null
    }
  })

  return promise
}

export async function saveSelectedMealType(type: MealType): Promise<void> {
  cachedMealType = type
  cacheGeneration += 1
  try {
    await AsyncStorage.setItem(STORAGE_KEY, type)
  } catch (err) {
    console.error('[mealTypePreferences] save failed', err)
    throw err
  }
}
