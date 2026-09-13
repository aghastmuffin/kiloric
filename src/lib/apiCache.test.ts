import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  BARCODE_CACHE_TTL_MS,
  clearApiMemoryCache,
  getCacheTtl,
  getMemoryCachedResponse,
  normalizeCacheKey,
  SEARCH_CACHE_TTL_MS,
  setCachedResponse,
} from './apiCache'
import { authenticatedRequest } from '../components/apiUtils'

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    default: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key)
      }),
      getAllKeys: vi.fn(async () => Array.from(store.keys())),
      multiGet: vi.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
      multiRemove: vi.fn(async (keys: string[]) => {
        keys.forEach((k) => store.delete(k))
      }),
      clear: vi.fn(async () => store.clear()),
    },
  }
})

vi.mock('react-native-appwrite', () => ({
  Account: vi.fn(),
  Client: vi.fn(() => ({
    setEndpoint: vi.fn().mockReturnThis(),
    setProject: vi.fn().mockReturnThis(),
    setPlatform: vi.fn().mockReturnThis(),
    setSession: vi.fn().mockReturnThis(),
  })),
  Databases: vi.fn(),
  ID: { unique: () => 'mock-id' },
  Query: { equal: vi.fn() },
}))

vi.mock('./appwrite', () => ({
  account: { get: vi.fn() },
  client: { setSession: vi.fn() },
}))

describe('apiCache & apiUtils performance optimizations', () => {
  beforeEach(() => {
    clearApiMemoryCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normalizeCacheKey', () => {
    it('normalizes barcode endpoints using fast prefix matching', () => {
      expect(normalizeCacheKey('/api/barcode/0123456789')).toBe('/api/barcode/0123456789')
      expect(normalizeCacheKey('/api/barcode/0123456789', 'ords')).toBe('ords:/api/barcode/0123456789')
    })

    it('normalizes product endpoints correctly', () => {
      expect(normalizeCacheKey('/api/product/XYZ%20123')).toBe('/api/product/XYZ 123')
      expect(normalizeCacheKey('/api/product/XYZ%20123', 'legacy')).toBe('legacy:/api/product/XYZ 123')
    })

    it('normalizes fuzzy search endpoints to lowercase', () => {
      expect(normalizeCacheKey('/api/fuzzy/Greek%20Yogurt')).toBe('/api/fuzzy/greek yogurt')
      expect(normalizeCacheKey('/api/fuzzy/Greek%20Yogurt', 'ords')).toBe('ords:/api/fuzzy/greek yogurt')
    })
  })

  describe('getCacheTtl', () => {
    it('returns BARCODE_CACHE_TTL_MS for barcode and product endpoints', () => {
      expect(getCacheTtl('/api/barcode/123')).toBe(BARCODE_CACHE_TTL_MS)
      expect(getCacheTtl('/api/product/123')).toBe(BARCODE_CACHE_TTL_MS)
    })

    it('returns SEARCH_CACHE_TTL_MS for fuzzy search endpoints', () => {
      expect(getCacheTtl('/api/fuzzy/apple')).toBe(SEARCH_CACHE_TTL_MS)
    })

    it('returns null for unknown paths', () => {
      expect(getCacheTtl('/api/unknown')).toBeNull()
    })
  })

  describe('in-memory caching & clearApiMemoryCache', () => {
    it('synchronously reads memory cache without microtask overhead', async () => {
      const endpoint = '/api/barcode/777'
      const payload = { title: 'Test Product', kcal: 250 }

      // Store in memory
      await setCachedResponse(endpoint, payload, 60000, 'ords')

      // Synchronous read
      const memResult = getMemoryCachedResponse(endpoint, 'ords')
      expect(memResult).toEqual(payload)
    })

    it('clears memory cache via clearApiMemoryCache', async () => {
      const endpoint = '/api/barcode/888'
      await setCachedResponse(endpoint, { foo: 'bar' }, 60000)

      expect(getMemoryCachedResponse(endpoint)).not.toBeNull()

      clearApiMemoryCache()

      expect(getMemoryCachedResponse(endpoint)).toBeNull()
    })

    it('returns null for expired entries and purges them from memory', async () => {
      const endpoint = '/api/barcode/999'
      await setCachedResponse(endpoint, { expired: true }, -1000)

      expect(getMemoryCachedResponse(endpoint)).toBeNull()
    })
  })

  describe('concurrent request deduplication in authenticatedRequest', () => {
    it('deduplicates parallel requests to the same endpoint and only fetches once', async () => {
      const barcode = '123456789012'
      const endpoint = `/api/barcode/${barcode}`
      const responseBody = { name: 'Deduplicated Energy Bar', calories: 200 }

      const mockFetch = vi.fn().mockImplementation(async () => {
        // Add artificial delay to simulate network latency
        await new Promise((res) => setTimeout(res, 50))
        return {
          ok: true,
          status: 200,
          json: async () => responseBody,
        }
      })

      vi.stubGlobal('fetch', mockFetch)

      // Fire 3 concurrent requests simultaneously
      const req1 = authenticatedRequest(endpoint)
      const req2 = authenticatedRequest(endpoint)
      const req3 = authenticatedRequest(endpoint)

      const [res1, res2, res3] = await Promise.all([req1, req2, req3])

      expect(res1).toEqual(responseBody)
      expect(res2).toEqual(responseBody)
      expect(res3).toEqual(responseBody)

      // Fetch should only be called ONCE due to inflight request deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
