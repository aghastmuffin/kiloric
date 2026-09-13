import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_PREFIX = '@calcount/api_cache:'
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_MEMORY_ENTRIES = 100
const MAX_STORED_ENTRIES = 200
const STORAGE_PRUNE_INTERVAL = 25

/** Barcode / product macro data — stable, cache aggressively. */
export const BARCODE_CACHE_TTL_MS = 14 * DAY_MS

/** Fuzzy text search — cache for a few days. */
export const SEARCH_CACHE_TTL_MS = 3 * DAY_MS

type CacheEntry = {
  data: unknown
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry>()
let writesSinceStoragePrune = STORAGE_PRUNE_INTERVAL - 1
let storagePrunePromise: Promise<void> | null = null

function parseCacheEntry(raw: string): CacheEntry | null {
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    if (!Object.prototype.hasOwnProperty.call(value, 'data')) return null

    const entry = value as Partial<CacheEntry>
    if (!Number.isFinite(entry.expiresAt)) return null
    return { data: entry.data, expiresAt: entry.expiresAt as number }
  } catch {
    return null
  }
}

function setMemoryEntry(cacheKey: string, entry: CacheEntry): void {
  memoryCache.delete(cacheKey)
  memoryCache.set(cacheKey, entry)

  while (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value
    if (typeof oldestKey !== 'string') break
    memoryCache.delete(oldestKey)
  }
}

async function pruneStoredEntries(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(STORAGE_PREFIX))
    if (keys.length === 0) return

    const now = Date.now()
    const entries = await AsyncStorage.multiGet(keys)
    const remove = new Set<string>()
    const fresh: { key: string; expiresAt: number }[] = []

    for (const [key, raw] of entries) {
      const entry = raw ? parseCacheEntry(raw) : null
      if (!entry || entry.expiresAt <= now) {
        remove.add(key)
      } else {
        fresh.push({ key, expiresAt: entry.expiresAt })
      }
    }

    const overflow = Math.max(0, fresh.length - MAX_STORED_ENTRIES)
    fresh
      .sort((a, b) => a.expiresAt - b.expiresAt)
      .slice(0, overflow)
      .forEach(({ key }) => remove.add(key))

    if (remove.size > 0) {
      await AsyncStorage.multiRemove([...remove])
    }
  } catch (err) {
    console.warn('[apiCache] prune failed', err)
  }
}

function maybePruneStoredEntries(): Promise<void> {
  writesSinceStoragePrune += 1
  if (writesSinceStoragePrune < STORAGE_PRUNE_INTERVAL) return Promise.resolve()
  writesSinceStoragePrune = 0

  if (!storagePrunePromise) {
    storagePrunePromise = pruneStoredEntries().finally(() => {
      storagePrunePromise = null
    })
  }
  return storagePrunePromise
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).trim()
  } catch {
    return segment.trim()
  }
}

export function normalizeCacheKey(endpoint: string, backend?: string): string {
  const [path, query = ''] = endpoint.split('?')

  let base: string
  // Use fast startsWith string operations to avoid RegExp allocation overhead
  const lowerPath = path.toLowerCase()
  if (lowerPath.startsWith('/api/barcode/')) {
    base = `/api/barcode/${decodePathSegment(path.slice(13))}`
  } else if (lowerPath.startsWith('/api/product/')) {
    base = `/api/product/${decodePathSegment(path.slice(13))}`
  } else if (lowerPath.startsWith('/api/fuzzy/')) {
    base = `/api/fuzzy/${decodePathSegment(path.slice(11)).toLowerCase()}`
  } else {
    base = path + (query ? `?${query}` : '')
  }

  return backend ? `${backend}:${base}` : base
}

/** Clear all in-memory API response cache entries. */
export function clearApiMemoryCache(): void {
  memoryCache.clear()
}

/** Synchronously retrieve response from in-memory cache if available and fresh. */
export function getMemoryCachedResponse(
  endpoint: string,
  backend?: string,
): unknown | null {
  const cacheKey = normalizeCacheKey(endpoint, backend)
  const memoryEntry = memoryCache.get(cacheKey)
  if (memoryEntry) {
    if (isFresh(memoryEntry)) {
      setMemoryEntry(cacheKey, memoryEntry)
      return memoryEntry.data
    }
    memoryCache.delete(cacheKey)
  }
  return null
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

export async function getCachedResponse(
  endpoint: string,
  backend?: string,
): Promise<unknown | null> {
  const mem = getMemoryCachedResponse(endpoint, backend)
  if (mem !== null) {
    return mem
  }

  const cacheKey = normalizeCacheKey(endpoint, backend)
  try {
    const raw = await AsyncStorage.getItem(storageKey(cacheKey))
    if (!raw) return null

    const entry = parseCacheEntry(raw)
    if (!entry || !isFresh(entry)) {
      await AsyncStorage.removeItem(storageKey(cacheKey))
      return null
    }

    setMemoryEntry(cacheKey, entry)
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
  backend?: string,
): Promise<void> {
  const cacheKey = normalizeCacheKey(endpoint, backend)
  const entry: CacheEntry = {
    data,
    expiresAt: Date.now() + ttlMs,
  }

  setMemoryEntry(cacheKey, entry)

  try {
    await AsyncStorage.setItem(storageKey(cacheKey), JSON.stringify(entry))
    await maybePruneStoredEntries()
  } catch (err) {
    console.warn('[apiCache] write failed', err)
  }
}
