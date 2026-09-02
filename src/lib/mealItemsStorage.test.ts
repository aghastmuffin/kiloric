import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  appendMealBarcode,
  clearMealBarcodes,
  clearMealBarcodesCache,
  loadMealBarcodes,
  removeMealBarcode,
  updateMealItemServings,
} from './mealItemsStorage'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

describe('mealItemsStorage caching & deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMealBarcodesCache()
  })

  it('fetches from AsyncStorage on first call and caches the result for subsequent calls', async () => {
    const mockStore = {
      Breakfast: [{ barcode: '12345678', servings: 1 }],
      Lunch: [],
      Dinner: [],
      Snack: [],
      Other: [],
    }
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockStore))

    const store1 = await loadMealBarcodes()
    expect(store1.Breakfast).toHaveLength(1)
    expect(store1.Breakfast[0]?.barcode).toBe('12345678')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Second call should return cached result instantly without hitting AsyncStorage
    const store2 = await loadMealBarcodes()
    expect(store2).toEqual(store1)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent in-flight requests into a single AsyncStorage getItem call', async () => {
    const mockStore = {
      Breakfast: [{ barcode: '87654321', servings: 2 }],
      Lunch: [],
      Dinner: [],
      Snack: [],
      Other: [],
    }

    let resolveStorage: (val: string | null) => void = () => {}
    const storagePromise = new Promise<string | null>((resolve) => {
      resolveStorage = resolve
    })
    vi.mocked(AsyncStorage.getItem).mockReturnValueOnce(storagePromise)

    const p1 = loadMealBarcodes()
    const p2 = loadMealBarcodes()

    expect(p1).toBe(p2)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    resolveStorage(JSON.stringify(mockStore))
    const [res1, res2] = await Promise.all([p1, p2])
    expect(res1).toEqual(res2)
    expect(res1.Breakfast[0]?.barcode).toBe('87654321')
  })

  it('synchronously updates in-memory cache when appending a barcode', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)

    await loadMealBarcodes()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    const updated = await appendMealBarcode('Breakfast', '99999999', 1.5)
    expect(updated.Breakfast).toHaveLength(1)
    expect(updated.Breakfast[0]?.barcode).toBe('99999999')
    expect(updated.Breakfast[0]?.servings).toBe(1.5)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@calcount/meal_barcodes',
      JSON.stringify(updated),
    )

    // Next load uses cached value without calling AsyncStorage.getItem again
    const loaded = await loadMealBarcodes()
    expect(loaded.Breakfast[0]?.barcode).toBe('99999999')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('synchronously updates in-memory cache on remove, update servings, and clear', async () => {
    const initialStore = {
      Breakfast: [
        { barcode: '11111111', servings: 1 },
        { barcode: '22222222', servings: 2 },
      ],
      Lunch: [],
      Dinner: [],
      Snack: [],
      Other: [],
    }
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(initialStore))

    await loadMealBarcodes()

    // Update servings
    const updatedServings = await updateMealItemServings('Breakfast', 0, 3)
    expect(updatedServings.Breakfast[0]?.servings).toBe(3)

    // Remove entry
    const removedStore = await removeMealBarcode('Breakfast', 1)
    expect(removedStore.Breakfast).toHaveLength(1)
    expect(removedStore.Breakfast[0]?.barcode).toBe('11111111')

    // Clear store
    const clearedStore = await clearMealBarcodes()
    expect(clearedStore.Breakfast).toHaveLength(0)

    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('re-fetches from AsyncStorage after clearMealBarcodesCache is called', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)
    await loadMealBarcodes()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearMealBarcodesCache()

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)
    await loadMealBarcodes()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
