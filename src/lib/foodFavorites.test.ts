// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  loadFavoriteFoods,
  saveFavoriteFoods,
  toggleFavoriteFood,
  clearFavoriteFoodsCache,
  type FavoriteFood,
} from './foodFavorites'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

describe('foodFavorites in-memory caching and deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFavoriteFoodsCache()
  })

  it('loadFavoriteFoods loads from AsyncStorage on first call and caches in memory', async () => {
    const mockFavorites: FavoriteFood[] = [
      {
        barcode: '123456',
        title: 'Apple',
        protein: 0.3,
        carbs: 25,
        fat: 0.2,
        kcal: 95,
        savedAt: '2025-01-01T00:00:00.000Z',
      },
    ]
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockFavorites))

    const result1 = await loadFavoriteFoods()
    expect(result1).toEqual(mockFavorites)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Second call should return from memory cache without querying AsyncStorage
    const result2 = await loadFavoriteFoods()
    expect(result2).toEqual(mockFavorites)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates simultaneous in-flight loadFavoriteFoods calls', async () => {
    const mockFavorites: FavoriteFood[] = [
      {
        barcode: '654321',
        title: 'Banana',
        protein: 1.3,
        carbs: 27,
        fat: 0.3,
        kcal: 105,
        savedAt: '2025-01-01T00:00:00.000Z',
      },
    ]
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockFavorites))

    const p1 = loadFavoriteFoods()
    const p2 = loadFavoriteFoods()

    const [res1, res2] = await Promise.all([p1, p2])
    expect(res1).toEqual(mockFavorites)
    expect(res2).toEqual(mockFavorites)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('saveFavoriteFoods updates memory cache synchronously', async () => {
    const newFavorites: FavoriteFood[] = [
      {
        barcode: '111111',
        title: 'Oats',
        protein: 5,
        carbs: 30,
        fat: 2,
        kcal: 150,
        savedAt: '2025-01-01T00:00:00.000Z',
      },
    ]

    await saveFavoriteFoods(newFavorites)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'vitality_food_favorites_v1',
      JSON.stringify(newFavorites),
    )

    // Subsequent load calls return updated cache directly without reading AsyncStorage
    const loaded = await loadFavoriteFoods()
    expect(loaded).toEqual(newFavorites)
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('toggleFavoriteFood adds/removes items and updates memory cache', async () => {
    const item = {
      barcode: '999999',
      title: 'Greek Yogurt',
      protein: 15,
      carbs: 6,
      fat: 0,
      kcal: 90,
    }

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify([]))

    // Toggle on (add item)
    const afterAdd = await toggleFavoriteFood(item)
    expect(afterAdd.length).toBe(1)
    expect(afterAdd[0].barcode).toBe('999999')

    // Toggle off (remove item)
    const afterRemove = await toggleFavoriteFood(item)
    expect(afterRemove.length).toBe(0)
  })

  it('clearFavoriteFoodsCache forces loadFavoriteFoods to query AsyncStorage again', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([]))

    await loadFavoriteFoods()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearFavoriteFoodsCache()

    await loadFavoriteFoods()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
