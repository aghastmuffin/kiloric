import AsyncStorage from '@react-native-async-storage/async-storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearFavoriteFoodsCache,
  loadFavoriteFoods,
  saveFavoriteFoods,
  toggleFavoriteFood,
  type FavoriteFood,
} from './foodFavorites'

let store: Record<string, string> = {}

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key]
      }),
      clear: vi.fn(async () => {
        store = {}
      }),
    },
  }
})

describe('foodFavorites', () => {
  beforeEach(() => {
    store = {}
    vi.clearAllMocks()
    clearFavoriteFoodsCache()
  })

  const sampleFood: FavoriteFood = {
    barcode: '12345678',
    title: 'Oatmeal',
    protein: 10,
    carbs: 40,
    fat: 5,
    kcal: 250,
    savedAt: '2025-01-01T00:00:00.000Z',
  }

  it('loads favorite foods from AsyncStorage on initial call', async () => {
    await AsyncStorage.setItem('vitality_food_favorites_v1', JSON.stringify([sampleFood]))

    const result = await loadFavoriteFoods()
    expect(result).toHaveLength(1)
    expect(result[0].barcode).toBe('12345678')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('uses in-memory cache on subsequent loadFavoriteFoods calls without hitting AsyncStorage again', async () => {
    await AsyncStorage.setItem('vitality_food_favorites_v1', JSON.stringify([sampleFood]))

    const res1 = await loadFavoriteFoods()
    const res2 = await loadFavoriteFoods()

    expect(res1).toBe(res2)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates parallel loadFavoriteFoods calls', async () => {
    await AsyncStorage.setItem('vitality_food_favorites_v1', JSON.stringify([sampleFood]))

    const [res1, res2] = await Promise.all([loadFavoriteFoods(), loadFavoriteFoods()])

    expect(res1).toBe(res2)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('updates in-memory cache when saving favorite foods', async () => {
    await saveFavoriteFoods([sampleFood])

    const loaded = await loadFavoriteFoods()
    expect(loaded).toEqual([sampleFood])
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('updates in-memory cache when toggling favorite foods', async () => {
    const toggled = await toggleFavoriteFood({
      barcode: sampleFood.barcode,
      title: sampleFood.title,
      protein: sampleFood.protein,
      carbs: sampleFood.carbs,
      fat: sampleFood.fat,
      kcal: sampleFood.kcal,
    })

    expect(toggled).toHaveLength(1)
    expect(toggled[0].barcode).toBe('12345678')

    const loaded = await loadFavoriteFoods()
    expect(loaded).toEqual(toggled)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1) // called once inside initial toggleFavoriteFood

    // Toggling again should remove it
    const toggledOff = await toggleFavoriteFood({
      barcode: sampleFood.barcode,
      title: sampleFood.title,
      protein: sampleFood.protein,
      carbs: sampleFood.carbs,
      fat: sampleFood.fat,
      kcal: sampleFood.kcal,
    })

    expect(toggledOff).toHaveLength(0)
    const reLoaded = await loadFavoriteFoods()
    expect(reLoaded).toHaveLength(0)
  })

  it('clears in-memory cache when clearFavoriteFoodsCache is called', async () => {
    await saveFavoriteFoods([sampleFood])

    clearFavoriteFoodsCache()

    await loadFavoriteFoods()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })
})
