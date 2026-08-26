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

let favoritesCache: FavoriteFood[] | null = null
let inflightLoadFavorites: Promise<FavoriteFood[]> | null = null
let cacheGeneration = 0

function parseFavoriteFoods(raw: string | null): FavoriteFood[] {
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
}

export function clearFavoriteFoodsCache(): void {
  cacheGeneration += 1
  favoritesCache = null
  inflightLoadFavorites = null
}

export function loadFavoriteFoods(): Promise<FavoriteFood[]> {
  if (favoritesCache !== null) return Promise.resolve(favoritesCache)
  if (inflightLoadFavorites) return inflightLoadFavorites

  const generation = cacheGeneration
  let loadedSuccessfully = false
  const request = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const entries = parseFavoriteFoods(raw)
      loadedSuccessfully = true
      return entries
    })
    .catch(() => [])

  inflightLoadFavorites = request
  request
    .then((entries) => {
      if (
        loadedSuccessfully &&
        cacheGeneration === generation &&
        inflightLoadFavorites === request
      ) {
        favoritesCache = entries
      }
    })
    .finally(() => {
      if (inflightLoadFavorites === request) inflightLoadFavorites = null
    })

  return request
}

export async function saveFavoriteFoods(favorites: FavoriteFood[]): Promise<void> {
  const entries = favorites.slice(0, 40)
  const generation = cacheGeneration
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  if (cacheGeneration !== generation) return
  cacheGeneration += 1
  favoritesCache = entries
  inflightLoadFavorites = null
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
