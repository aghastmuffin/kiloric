// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

vi.mock('./mealFromProduct', () => ({
  buildMealInputFromProduct: vi.fn().mockReturnValue({ kcal: 250 }),
}))

vi.mock('./productDisplay', () => ({
  getBarcodeFromProduct: vi.fn().mockReturnValue(null),
  getProductTitle: vi.fn().mockReturnValue('Sample Product'),
}))

import {
  listRecentFoods,
  recordRecentFood,
  clearRecentFoodsCache,
  clearRecentFoods,
} from './recentFoods'

describe('recentFoods caching and deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearRecentFoodsCache()
  })

  it('deduplicates concurrent listRecentFoods requests and caches results', async () => {
    const sampleItems = [
      {
        id: '1',
        barcode: '12345',
        query: null,
        title: 'Apple',
        kcal: 95,
        usedAt: '2025-01-01T10:00:00.000Z',
      },
    ]

    let resolveGetItem: (val: string | null) => void = () => {}
    const asyncStoragePromise = new Promise<string | null>((resolve) => {
      resolveGetItem = resolve
    })

    vi.mocked(AsyncStorage.getItem).mockImplementation(() => asyncStoragePromise)

    // Fire two concurrent calls
    const p1 = listRecentFoods('user1')
    const p2 = listRecentFoods('user1')

    // Expect p1 and p2 to be the exact same promise instance (deduplicated)
    expect(p1).toBe(p2)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Resolve storage load
    resolveGetItem(JSON.stringify(sampleItems))

    const res1 = await p1
    const res2 = await p2

    expect(res1).toEqual(sampleItems)
    expect(res2).toEqual(sampleItems)

    // Subsequent call should hit in-memory cache directly without calling AsyncStorage
    const res3 = await listRecentFoods('user1')
    expect(res3).toEqual(sampleItems)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('updates in-memory cache when recording new recent food', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null)
    vi.mocked(AsyncStorage.setItem).mockResolvedValue()

    await recordRecentFood('user1', {
      id: 'banana',
      barcode: null,
      query: 'banana',
      title: 'Banana',
      kcal: 105,
    })

    expect(AsyncStorage.setItem).toHaveBeenCalled()

    vi.clearAllMocks() // Clear mocks so we can check if getItem is called on subsequent listRecentFoods call

    // Calling listRecentFoods should read directly from in-memory cache
    const items = await listRecentFoods('user1')
    expect(items.length).toBe(1)
    expect(items[0].id).toBe('banana')
    expect(items[0].title).toBe('Banana')
    // AsyncStorage.getItem was not called during listRecentFoods because of the cache update in recordRecentFood
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('clears in-memory cache via clearRecentFoods', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(
      JSON.stringify([
        {
          id: 'item1',
          barcode: null,
          query: 'item1',
          title: 'Item 1',
          kcal: 100,
          usedAt: '2025-01-01T10:00:00.000Z',
        },
      ]),
    )

    await listRecentFoods('user1')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Clear cache
    await clearRecentFoods('user1')

    // Fetching again should hit AsyncStorage again
    await listRecentFoods('user1')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
