import { inferMealTypeFromTime } from '@/lib/mealFromProduct'
import { MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@calcount/selected_meal_type'

export const DEFAULT_MEAL_TYPE: MealType = inferMealTypeFromTime()

export async function loadSelectedMealType(): Promise<MealType> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value && MEAL_TYPE_OPTIONS.includes(value as MealType)) {
      return value as MealType
    }
  } catch (err) {
    console.error('[mealTypePreferences] load failed', err)
  }
  return DEFAULT_MEAL_TYPE
}

export async function saveSelectedMealType(type: MealType): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, type)
}
