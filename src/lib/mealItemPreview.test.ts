import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearMealItemPreviewCache, fetchMealItemPreview } from './mealItemPreview'

vi.mock('../components/apiUtils', () => ({
  authenticatedRequest: vi.fn(),
}))

vi.mock('./apiBackendPreferences', () => ({
  resolveApiBackendChoice: vi.fn().mockResolvedValue('openfoodfacts'),
}))

vi.mock('./apiCache', () => ({
  getCachedResponse: vi.fn().mockResolvedValue(null),
}))

import { authenticatedRequest } from '../components/apiUtils'

describe('mealItemPreview caching & deduplication', () => {
  beforeEach(() => {
    clearMealItemPreviewCache()
    vi.clearAllMocks()
  })

  it('fetches meal item preview from API on first call and caches result', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValueOnce({
      code: '123456',
      product_name: 'Oat Milk',
      calories: 50,
      protein: 1.2,
      carbs: 7,
      fat: 1.5,
    })

    const preview1 = await fetchMealItemPreview('123456', 'Breakfast', 1)
    expect(preview1.title).toBe('Oat Milk')
    expect(preview1.kcal).toBe(50)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)

    // Second call should return cached result without hitting authenticatedRequest again
    const preview2 = await fetchMealItemPreview('123456', 'Breakfast', 1)
    expect(preview2).toEqual(preview1)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests for the same barcode and parameters', async () => {
    let resolveRequest: (val: unknown) => void = () => {}
    const deferred = new Promise((resolve) => {
      resolveRequest = resolve
    })

    vi.mocked(authenticatedRequest).mockImplementationOnce(() => deferred as Promise<unknown>)

    const p1 = fetchMealItemPreview('789012', 'Lunch', 1)
    const p2 = fetchMealItemPreview('789012', 'Lunch', 1)

    // Concurrent requests return the exact same promise reference
    expect(p1).toBe(p2)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)

    resolveRequest({
      code: '789012',
      product_name: 'Greek Yogurt',
    })

    const [res1, res2] = await Promise.all([p1, p2])
    expect(res1.title).toBe('Greek Yogurt')
    expect(res2.title).toBe('Greek Yogurt')
  })

  it('clears in-memory cache when clearMealItemPreviewCache is called', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue({
      code: '999999',
      product_name: 'Apple',
    })

    await fetchMealItemPreview('999999', 'Snack', 1)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)

    clearMealItemPreviewCache()

    await fetchMealItemPreview('999999', 'Snack', 1)
    expect(authenticatedRequest).toHaveBeenCalledTimes(2)
  })
})
