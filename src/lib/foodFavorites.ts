import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_PREFIX = '@calcount/food_favorites:'
const LEGACY_STORAGE_KEY = 'vitality_food_favorites_v1'

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

/**
 * Sanitize favorite food properties and enforce strict length bounds
 * to prevent DoS, memory leaks, and AsyncStorage storage exhaustion attacks.
 */
function sanitizeFavoriteFood(food: FavoriteFood): FavoriteFood {
  return {
    ...food,
    barcode: (food.barcode ?? '').trim().slice(0, 128),
    title: (food.title ?? '').trim().slice(0, 256) || 'Favorite Food',
  }
}

function parseFavoriteFoods(raw: string | null): FavoriteFood[] {
  if (!raw) return []
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(
      (item): item is FavoriteFood =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as FavoriteFood).barcode === 'string' &&
        typeof (item as FavoriteFood).title === 'string',
    )
    .map(sanitizeFavoriteFood)
}

type UserCacheState = {
  favorites: FavoriteFood[] | null
  inflight: Promise<FavoriteFood[]> | null
  generation: number
}

const userCaches = new Map<string, UserCacheState>()

function getUserCache(userKey: string): UserCacheState {
  let cache = userCaches.get(userKey)
  if (!cache) {
    cache = { favorites: null, inflight: null, generation: 0 }
    userCaches.set(userKey, cache)
  }
  return cache
}

export function clearFoodFavoritesCache(userKey?: string): void {
  if (userKey) {
    const cache = userCaches.get(userKey)
    if (cache) {
      cache.generation += 1
      cache.favorites = null
      cache.inflight = null
    }
  } else {
    for (const cache of userCaches.values()) {
      cache.generation += 1
      cache.favorites = null
      cache.inflight = null
    }
    userCaches.clear()
  }
}

export const clearFavoriteFoodsCache = clearFoodFavoritesCache

export function loadFavoriteFoods(userKeyOrEmpty?: string): Promise<FavoriteFood[]> {
  const userKey = favoritesUserKey(userKeyOrEmpty)
  const cache = getUserCache(userKey)

  if (cache.favorites !== null) return Promise.resolve(cache.favorites)
  if (cache.inflight) return cache.inflight

  const generation = cache.generation
  let loadedSuccessfully = false
  const request = (async () => {
    try {
      if (typeof AsyncStorage.removeItem === 'function') {
        try {
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch {
          // ignore legacy cleanup error
        }
      }
      const raw = await AsyncStorage.getItem(storageKey(userKey))
      const entries = parseFavoriteFoods(raw)
      loadedSuccessfully = true
      return entries
    } catch {
      return []
    }
  })()

  cache.inflight = request
  request
    .then((entries) => {
      if (
        loadedSuccessfully &&
        cache.generation === generation &&
        cache.inflight === request
      ) {
        cache.favorites = entries
      }
    })
    .finally(() => {
      if (cache.inflight === request) cache.inflight = null
    })

  return request
}

export async function saveFavoriteFoods(
  userKeyOrFavorites: string | FavoriteFood[],
  maybeFavorites?: FavoriteFood[],
): Promise<void> {
  const userKey = typeof userKeyOrFavorites === 'string' ? userKeyOrFavorites : 'local'
  const favorites = Array.isArray(userKeyOrFavorites) ? userKeyOrFavorites : (maybeFavorites ?? [])
  // Sanitize entries to enforce input length limits and prevent DoS / storage bloat
  const entries = favorites.slice(0, 40).map(sanitizeFavoriteFood)
  const cache = getUserCache(userKey)
  const generation = cache.generation

  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(entries))
  if (cache.generation !== generation) return
  cache.generation += 1
  cache.favorites = entries
  cache.inflight = null
}

export async function toggleFavoriteFood(
  userKeyOrFood: string | Omit<FavoriteFood, 'savedAt'>,
  maybeFood?: Omit<FavoriteFood, 'savedAt'>,
): Promise<FavoriteFood[]> {
  const userKey = typeof userKeyOrFood === 'string' ? userKeyOrFood : 'local'
  const food = typeof userKeyOrFood === 'object' ? userKeyOrFood : maybeFood!
  const sanitizedBarcode = (food.barcode ?? '').trim().slice(0, 128)
  const sanitizedTitle = (food.title ?? '').trim().slice(0, 256) || 'Favorite Food'
  const sanitizedFood = { ...food, barcode: sanitizedBarcode, title: sanitizedTitle }

  const current = await loadFavoriteFoods(userKey)
  const exists = current.some((item) => item.barcode === sanitizedFood.barcode)
  const next = exists
    ? current.filter((item) => item.barcode !== sanitizedFood.barcode)
    : [{ ...sanitizedFood, savedAt: new Date().toISOString() }, ...current]
  await saveFavoriteFoods(userKey, next)
  return next
}
