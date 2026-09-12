// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearRecentFoods,
  clearRecentFoodsCache,
  listRecentFoods,
  recordRecentFood,
  recentFoodsUserKey,
  type RecentFoodEntry,
} from './recentFoods'

const mockStorage: Record<string, string> = {}

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key]
      return Promise.resolve()
    }),
  },
}))

describe('recentFoods with in-memory caching and request deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key]
    }
    clearRecentFoodsCache()
  })

  it('recentFoodsUserKey returns fallback when userId is undefined', () => {
    expect(recentFoodsUserKey(undefined)).toBe('local')
    expect(recentFoodsUserKey('user-123')).toBe('user-123')
  })

  it('fetches recent foods from storage and caches the result', async () => {
    const userKey = 'user-1'
    const mockEntries: RecentFoodEntry[] = [
      {
        id: 'apple',
        barcode: null,
        query: 'apple',
        title: 'Apple',
        kcal: 95,
        usedAt: new Date().toISOString(),
      },
    ]
    mockStorage['@calcount/recent_foods:user-1'] = JSON.stringify(mockEntries)

    // First fetch should hit AsyncStorage
    const firstFetch = await listRecentFoods(userKey)
    expect(firstFetch).toHaveLength(1)
    expect(firstFetch[0].title).toBe('Apple')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Second fetch should return cached data without calling AsyncStorage again
    const secondFetch = await listRecentFoods(userKey)
    expect(secondFetch).toEqual(firstFetch)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests to listRecentFoods', async () => {
    const userKey = 'user-2'
    const [req1, req2] = await Promise.all([
      listRecentFoods(userKey),
      listRecentFoods(userKey),
    ])

    expect(req1).toEqual(req2)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('synchronously updates memory cache when recordRecentFood is called', async () => {
    const userKey = 'user-3'

    await recordRecentFood(userKey, {
      id: 'banana',
      barcode: null,
      query: 'banana',
      title: 'Banana',
      kcal: 105,
    })

    // Sub-sequence fetch should return Banana directly from memory cache
    const items = await listRecentFoods(userKey)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Banana')
    expect(AsyncStorage.setItem).toHaveBeenCalled()
  })

  it('clearRecentFoods invalidates memory cache and removes from storage', async () => {
    const userKey = 'user-4'
    await recordRecentFood(userKey, {
      id: 'oats',
      barcode: null,
      query: 'oats',
      title: 'Oats',
      kcal: 150,
    })

    await clearRecentFoods(userKey)

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@calcount/recent_foods:user-4')

    // After clearing, fetching should re-read storage (which is now empty)
    const items = await listRecentFoods(userKey)
    expect(items).toHaveLength(0)
  })

  it('truncates oversized input strings to max length limits for security defense-in-depth', async () => {
    const userKey = 'user-5'
    const longId = 'a'.repeat(300)
    const longTitle = 'b'.repeat(300)
    const longBarcode = 'c'.repeat(200)
    const longQuery = 'd'.repeat(300)

    await recordRecentFood(userKey, {
      id: longId,
      title: longTitle,
      barcode: longBarcode,
      query: longQuery,
      kcal: 200,
    })

    const items = await listRecentFoods(userKey)
    expect(items).toHaveLength(1)
    expect(items[0].id).toHaveLength(256)
    expect(items[0].id).toBe('a'.repeat(256))
    expect(items[0].title).toHaveLength(256)
    expect(items[0].title).toBe('b'.repeat(256))
    expect(items[0].barcode).toHaveLength(128)
    expect(items[0].barcode).toBe('c'.repeat(128))
    expect(items[0].query).toHaveLength(256)
    expect(items[0].query).toBe('d'.repeat(256))
  })
})
