// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  clearApiMemoryCache,
  getCachedResponse,
  setCachedResponse,
} from './apiCache'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}))

describe('apiCache memory cache clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearApiMemoryCache()
  })

  it('stores and retrieves items from in-memory cache', async () => {
    const endpoint = '/api/barcode/123456789'
    const data = { product_name: 'Test Product' }

    await setCachedResponse(endpoint, data, 60_000)
    const cached = await getCachedResponse(endpoint)

    expect(cached).toEqual(data)
  })

  it('clearApiMemoryCache purges all entries from in-memory cache', async () => {
    const endpoint = '/api/barcode/123456789'
    const data = { product_name: 'Test Product' }

    await setCachedResponse(endpoint, data, 60_000)
    expect(await getCachedResponse(endpoint)).toEqual(data)

    clearApiMemoryCache()

    // Since memoryCache was cleared and AsyncStorage returns null, getCachedResponse should return null
    expect(await getCachedResponse(endpoint)).toBeNull()
  })
})
