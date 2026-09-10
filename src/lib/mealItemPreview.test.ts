// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchMealItemPreview, clearMealItemPreviewCache } from './mealItemPreview'
import { authenticatedRequest } from '../components/apiUtils'

vi.mock('../components/apiUtils', () => ({
  authenticatedRequest: vi.fn(),
}))

vi.mock('./apiBackendPreferences', () => ({
  resolveApiBackendChoice: vi.fn().mockResolvedValue('off'),
}))

vi.mock('./apiCache', () => ({
  getCachedResponse: vi.fn().mockResolvedValue(null),
}))

describe('mealItemPreview caching & request deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMealItemPreviewCache()
  })

  it('fetches product preview from API and caches subsequent calls', async () => {
    const mockProduct = {
      product_name: 'Oat Milk',
      nutriments: {
        'energy-kcal': 120,
        proteins: 3,
        carbohydrates: 16,
        fat: 5,
      },
    }

    vi.mocked(authenticatedRequest).mockResolvedValueOnce(mockProduct)

    const firstCall = await fetchMealItemPreview('1234567890', 'Breakfast', 1)
    expect(firstCall.title).toBe('Oat Milk')
    expect(firstCall.kcal).toBe(120)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)

    // Second call should return cached preview without invoking authenticatedRequest again
    const secondCall = await fetchMealItemPreview('1234567890', 'Breakfast', 1)
    expect(secondCall).toEqual(firstCall)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests into a single network call', async () => {
    const mockProduct = {
      product_name: 'Almond Butter',
      nutriments: {
        'energy-kcal': 200,
      },
    }

    vi.mocked(authenticatedRequest).mockResolvedValue(
      new Promise((resolve) => setTimeout(() => resolve(mockProduct), 10)),
    )

    const [req1, req2] = await Promise.all([
      fetchMealItemPreview('9876543210', 'Lunch', 1),
      fetchMealItemPreview('9876543210', 'Lunch', 1),
    ])

    expect(req1).toEqual(req2)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache when clearMealItemPreviewCache is called', async () => {
    const mockProduct = {
      product_name: 'Greek Yogurt',
    }

    vi.mocked(authenticatedRequest).mockResolvedValue(mockProduct)

    await fetchMealItemPreview('111222333', 'Snack', 1)
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)

    clearMealItemPreviewCache()

    await fetchMealItemPreview('111222333', 'Snack', 1)
    expect(authenticatedRequest).toHaveBeenCalledTimes(2)
  })

  it('prevents cleared in-flight request from repopulating the cache', async () => {
    let resolveNetwork: (value: unknown) => void = () => {}
    const networkPromise = new Promise((resolve) => {
      resolveNetwork = resolve
    })

    vi.mocked(authenticatedRequest).mockReturnValue(networkPromise)

    const inflightCall = fetchMealItemPreview('555666777', 'Dinner', 1)

    // Clear cache while request is in-flight
    clearMealItemPreviewCache()

    // Resolve network call
    resolveNetwork({ product_name: 'Late Response' })
    await inflightCall

    // Sub-sequence call should trigger a new network request rather than using the cleared in-flight result
    vi.mocked(authenticatedRequest).mockResolvedValueOnce({ product_name: 'Fresh Response' })
    const nextCall = await fetchMealItemPreview('555666777', 'Dinner', 1)

    expect(nextCall.title).toBe('Fresh Response')
    expect(authenticatedRequest).toHaveBeenCalledTimes(2)
  })
})
