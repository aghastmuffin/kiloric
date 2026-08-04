import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'vitality_food_favorites_v1'

export type FavoriteFood = {
  barcode: string
  title: string
  protein: number | null
  carbs: number | null
  fat: number | null
  kcal: number | null
  savedAt: string
}

export async function loadFavoriteFoods(): Promise<FavoriteFood[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is FavoriteFood =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as FavoriteFood).barcode === 'string' &&
        typeof (item as FavoriteFood).title === 'string',
    )
  } catch {
    return []
  }
}

export async function saveFavoriteFoods(favorites: FavoriteFood[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.slice(0, 40)))
}

export async function toggleFavoriteFood(food: Omit<FavoriteFood, 'savedAt'>): Promise<FavoriteFood[]> {
  const current = await loadFavoriteFoods()
  const exists = current.some((item) => item.barcode === food.barcode)
  const next = exists
    ? current.filter((item) => item.barcode !== food.barcode)
    : [{ ...food, savedAt: new Date().toISOString() }, ...current]
  await saveFavoriteFoods(next)
  return next
}
