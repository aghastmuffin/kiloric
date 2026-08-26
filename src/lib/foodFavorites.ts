import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_PREFIX = '@calcount/food_favorites:'
const LEGACY_STORAGE_KEY = 'vitality_food_favorites_v1'
const favoritesCache = new Map<string, FavoriteFood[]>()

export type FavoriteFood = {
  barcode: string
  title: string
  protein: number | null
  carbs: number | null
  fat: number | null
  kcal: number | null
  savedAt: string
}

export function favoritesUserKey(userId: string | undefined): string {
  return userId ?? 'local'
}

function storageKey(userKey: string): string {
  return `${STORAGE_PREFIX}${userKey}`
}

export function clearFoodFavoritesCache(userKey?: string): void {
  if (userKey) favoritesCache.delete(userKey)
  else favoritesCache.clear()
}

export async function loadFavoriteFoods(userKey: string): Promise<FavoriteFood[]> {
  const cached = favoritesCache.get(userKey)
  if (cached) return cached
  try {
    // Never migrate the old device-wide key: doing so could expose another
    // account's favorites. Remove it instead.
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY)
    const raw = await AsyncStorage.getItem(storageKey(userKey))
    if (!raw) {
      favoritesCache.set(userKey, [])
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const favorites = parsed.filter(
      (item): item is FavoriteFood =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as FavoriteFood).barcode === 'string' &&
        typeof (item as FavoriteFood).title === 'string',
    )
    favoritesCache.set(userKey, favorites)
    return favorites
  } catch {
    return []
  }
}

export async function saveFavoriteFoods(userKey: string, favorites: FavoriteFood[]): Promise<void> {
  const next = favorites.slice(0, 40)
  favoritesCache.set(userKey, next)
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next))
}

export async function toggleFavoriteFood(
  userKey: string,
  food: Omit<FavoriteFood, 'savedAt'>,
): Promise<FavoriteFood[]> {
  const current = await loadFavoriteFoods(userKey)
  const exists = current.some((item) => item.barcode === food.barcode)
  const next = exists
    ? current.filter((item) => item.barcode !== food.barcode)
    : [{ ...food, savedAt: new Date().toISOString() }, ...current]
  await saveFavoriteFoods(userKey, next)
  return next
}
