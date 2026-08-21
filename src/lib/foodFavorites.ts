import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'vitality_food_favorites_v1'

// In-memory cache and inflight request deduplication map to eliminate redundant AsyncStorage I/O reads & JSON parsing
let favoritesCache: FavoriteFood[] | null = null
let inflightLoadFavorites: Promise<FavoriteFood[]> | null = null

export type FavoriteFood = {
  barcode: string
  title: string
  protein: number | null
  carbs: number | null
  fat: number | null
  kcal: number | null
  savedAt: string
}

/** Clear in-memory favorite foods cache to avoid stale state across session switches or logouts. */
export function clearFavoriteFoodsCache(): void {
  favoritesCache = null
  inflightLoadFavorites = null
}

export function loadFavoriteFoods(): Promise<FavoriteFood[]> {
  // 1. Return synchronously from in-memory cache if available (0ms latency, zero I/O)
  if (favoritesCache !== null) {
    return Promise.resolve(favoritesCache)
  }

  // 2. Deduplicate simultaneous in-flight AsyncStorage loads
  if (inflightLoadFavorites !== null) {
    return inflightLoadFavorites
  }

  const request = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (!raw) {
        favoritesCache = []
        return []
      }
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) {
        favoritesCache = []
        return []
      }
      const entries = parsed.filter(
        (item): item is FavoriteFood =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as FavoriteFood).barcode === 'string' &&
          typeof (item as FavoriteFood).title === 'string',
      )
      favoritesCache = entries
      return entries
    } catch {
      favoritesCache = []
      return []
    } finally {
      inflightLoadFavorites = null
    }
  })()

  inflightLoadFavorites = request
  return request
}

export async function saveFavoriteFoods(favorites: FavoriteFood[]): Promise<void> {
  const sliced = favorites.slice(0, 40)
  // Synchronously update memory cache so subsequent reads reflect changes immediately
  favoritesCache = sliced
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sliced))
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
