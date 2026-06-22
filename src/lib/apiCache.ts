import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_PREFIX = '@calcount/api_cache:'
const DAY_MS = 24 * 60 * 60 * 1000

/** Barcode / product macro data — stable, cache aggressively. */
export const BARCODE_CACHE_TTL_MS = 14 * DAY_MS

/** Fuzzy text search — cache for a few days. */
export const SEARCH_CACHE_TTL_MS = 3 * DAY_MS

type CacheEntry = {
  data: unknown
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry>()

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).trim()
  } catch {
    return segment.trim()
  }
}

export function normalizeCacheKey(endpoint: string): string {
  const [path, query = ''] = endpoint.split('?')

  const barcodeMatch = path.match(/^\/api\/barcode\/(.+)$/i)
  if (barcodeMatch) {
    return `/api/barcode/${decodePathSegment(barcodeMatch[1])}`
  }

  const productMatch = path.match(/^\/api\/product\/(.+)$/i)
  if (productMatch) {
    return `/api/product/${decodePathSegment(productMatch[1])}`
  }

  const fuzzyMatch = path.match(/^\/api\/fuzzy\/(.+)$/i)
  if (fuzzyMatch) {
    return `/api/fuzzy/${decodePathSegment(fuzzyMatch[1]).toLowerCase()}`
  }

  return path + (query ? `?${query}` : '')
}

export function getCacheTtl(endpoint: string): number | null {
  const key = normalizeCacheKey(endpoint)

  if (key.startsWith('/api/barcode/') || key.startsWith('/api/product/')) {
    return BARCODE_CACHE_TTL_MS
  }

  if (key.startsWith('/api/fuzzy/')) {
    return SEARCH_CACHE_TTL_MS
  }

  return null
}

function isFresh(entry: CacheEntry): boolean {
  return entry.expiresAt > Date.now()
}

function storageKey(cacheKey: string): string {
  return `${STORAGE_PREFIX}${cacheKey}`
}

export async function getCachedResponse(endpoint: string): Promise<unknown | null> {
  const cacheKey = normalizeCacheKey(endpoint)
  const memoryEntry = memoryCache.get(cacheKey)
  if (memoryEntry) {
    if (isFresh(memoryEntry)) {
      return memoryEntry.data
    }
    memoryCache.delete(cacheKey)
  }

  try {
    const raw = await AsyncStorage.getItem(storageKey(cacheKey))
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (!isFresh(entry)) {
      await AsyncStorage.removeItem(storageKey(cacheKey))
      return null
    }

    memoryCache.set(cacheKey, entry)
    return entry.data
  } catch (err) {
    console.warn('[apiCache] read failed', err)
    return null
  }
}

export async function setCachedResponse(
  endpoint: string,
  data: unknown,
  ttlMs: number,
): Promise<void> {
  const cacheKey = normalizeCacheKey(endpoint)
  const entry: CacheEntry = {
    data,
    expiresAt: Date.now() + ttlMs,
  }

  memoryCache.set(cacheKey, entry)

  try {
    await AsyncStorage.setItem(storageKey(cacheKey), JSON.stringify(entry))
  } catch (err) {
    console.warn('[apiCache] write failed', err)
  }
}
