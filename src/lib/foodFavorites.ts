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

// In-memory cache and in-flight request promise for favorite foods.
// Eliminates repetitive AsyncStorage reads and JSON parsing overhead across re-renders and navigation.
let favoritesCache: FavoriteFood[] | null = null
let inflightLoadFavorites: Promise<FavoriteFood[]> | null = null

/**
 * Clears the in-memory cache for favorite foods.
 */
export function clearFavoriteFoodsCache(): void {
  favoritesCache = null
  inflightLoadFavorites = null
}

/**
 * Loads favorite foods from in-memory cache or AsyncStorage.
 * Deduplicates concurrent parallel requests.
 */
export function loadFavoriteFoods(): Promise<FavoriteFood[]> {
  if (favoritesCache !== null) {
    return Promise.resolve(favoritesCache)
  }

  if (inflightLoadFavorites) {
    return inflightLoadFavorites
  }

  inflightLoadFavorites = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (!raw) {
        favoritesCache = []
        return favoritesCache
      }
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) {
        favoritesCache = []
        return favoritesCache
      }
      const valid = parsed.filter(
        (item): item is FavoriteFood =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as FavoriteFood).barcode === 'string' &&
          typeof (item as FavoriteFood).title === 'string',
      )
      favoritesCache = valid
      return favoritesCache
    } catch {
      favoritesCache = []
      return favoritesCache
    } finally {
      inflightLoadFavorites = null
    }
  })()

  return inflightLoadFavorites
}

/**
 * Saves favorite foods to AsyncStorage and updates the in-memory cache.
 */
export async function saveFavoriteFoods(favorites: FavoriteFood[]): Promise<void> {
  const sliced = favorites.slice(0, 40)
  favoritesCache = sliced
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sliced))
}

/**
 * Toggles a favorite food item, saving changes to AsyncStorage and updating the in-memory cache.
 */
export async function toggleFavoriteFood(food: Omit<FavoriteFood, 'savedAt'>): Promise<FavoriteFood[]> {
  const current = await loadFavoriteFoods()
  const exists = current.some((item) => item.barcode === food.barcode)
  const next = exists
    ? current.filter((item) => item.barcode !== food.barcode)
    : [{ ...food, savedAt: new Date().toISOString() }, ...current]
  await saveFavoriteFoods(next)
  return next
}
