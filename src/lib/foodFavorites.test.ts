// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearFavoriteFoodsCache,
  loadFavoriteFoods,
  saveFavoriteFoods,
  toggleFavoriteFood,
  type FavoriteFood,
} from './foodFavorites'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}))

const apple: FavoriteFood = {
  barcode: '123456',
  title: 'Apple',
  protein: 0.3,
  carbs: 25,
  fat: 0.2,
  kcal: 95,
  savedAt: '2026-01-01T00:00:00.000Z',
}

describe('food favorites cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFavoriteFoodsCache()
  })

  it('caches successful loads and deduplicates concurrent reads', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify([apple]))

    const first = loadFavoriteFoods()
    const second = loadFavoriteFoods()

    expect(first).toBe(second)
    await expect(first).resolves.toEqual([apple])
    await expect(loadFavoriteFoods()).resolves.toEqual([apple])
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('retries after a transient storage failure instead of caching an empty result', async () => {
    vi.mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(JSON.stringify([apple]))

    await expect(loadFavoriteFoods()).resolves.toEqual([])
    await expect(loadFavoriteFoods()).resolves.toEqual([apple])
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })

  it('publishes saved values only after persistence succeeds', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify([apple]))
    await loadFavoriteFoods()

    const replacement = [{ ...apple, barcode: '654321', title: 'Banana' }]
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('write failed'))

    await expect(saveFavoriteFoods(replacement)).rejects.toThrow('write failed')
    await expect(loadFavoriteFoods()).resolves.toEqual([apple])
  })

  it('does not allow a cleared in-flight read to repopulate the cache', async () => {
    let resolveOldRead!: (value: string) => void
    const oldRead = new Promise<string>((resolve) => {
      resolveOldRead = resolve
    })
    const fresh = [{ ...apple, barcode: '654321', title: 'Banana' }]
    vi.mocked(AsyncStorage.getItem)
      .mockReturnValueOnce(oldRead)
      .mockResolvedValueOnce(JSON.stringify(fresh))

    const staleRequest = loadFavoriteFoods()
    clearFavoriteFoodsCache()
    const freshRequest = loadFavoriteFoods()
    resolveOldRead(JSON.stringify([apple]))

    await expect(staleRequest).resolves.toEqual([apple])
    await expect(freshRequest).resolves.toEqual(fresh)
    await expect(loadFavoriteFoods()).resolves.toEqual(fresh)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })

  it('does not publish a save that finishes after the cache is cleared', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify([apple]))
    await loadFavoriteFoods()

    let resolveWrite!: () => void
    vi.mocked(AsyncStorage.setItem).mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveWrite = resolve
    }))
    const replacement = [{ ...apple, barcode: '654321', title: 'Banana' }]
    const save = saveFavoriteFoods(replacement)
    clearFavoriteFoodsCache()
    resolveWrite()
    await save

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(replacement))
    await expect(loadFavoriteFoods()).resolves.toEqual(replacement)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })

  it('toggles favorites through the persisted cache', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)
    const food = {
      barcode: apple.barcode,
      title: apple.title,
      protein: apple.protein,
      carbs: apple.carbs,
      fat: apple.fat,
      kcal: apple.kcal,
    }

    await expect(toggleFavoriteFood(food)).resolves.toMatchObject([{ barcode: apple.barcode }])
    await expect(toggleFavoriteFood(food)).resolves.toEqual([])
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2)
  })

  it('truncates excessively long title and barcode input fields to prevent DoS/storage bloat', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)

    const oversizedFood = {
      barcode: 'B'.repeat(300),
      title: 'T'.repeat(500),
      protein: 10,
      carbs: 10,
      fat: 10,
      kcal: 100,
    }

    const result = await toggleFavoriteFood(oversizedFood)
    expect(result[0].barcode).toHaveLength(128)
    expect(result[0].barcode).toBe('B'.repeat(128))
    expect(result[0].title).toHaveLength(256)
    expect(result[0].title).toBe('T'.repeat(256))
  })
})
