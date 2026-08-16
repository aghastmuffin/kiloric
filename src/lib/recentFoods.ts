import { buildMealInputFromProduct } from './mealFromProduct'
import { getBarcodeFromProduct, getProductTitle } from './productDisplay'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_PREFIX = '@calcount/recent_foods:'
const MAX_RECENTS = 30

// In-memory cache for recent food entries per userKey to prevent redundant AsyncStorage I/O reads.
const recentFoodsCache = new Map<string, RecentFoodEntry[]>()
const inflightRequests = new Map<string, Promise<RecentFoodEntry[]>>()

export type RecentFoodEntry = {
  id: string
  barcode: string | null
  query: string | null
  title: string
  kcal: number | null
  usedAt: string
}

export function recentFoodsUserKey(userId: string | undefined): string {
  return userId ?? 'local'
}

function storageKey(userKey: string): string {
  return `${STORAGE_PREFIX}${userKey}`
}

function unwrapProductData(data: Record<string, unknown>): Record<string, unknown> {
  if ('data' in data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data as Record<string, unknown>
  }
  if ('product' in data && data.product && typeof data.product === 'object' && !Array.isArray(data.product)) {
    return data.product as Record<string, unknown>
  }
  return data
}

function isRecentFoodEntry(value: unknown): value is RecentFoodEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.usedAt === 'string' &&
    (entry.barcode === null || typeof entry.barcode === 'string') &&
    (entry.query === null || typeof entry.query === 'string') &&
    (entry.kcal === null || typeof entry.kcal === 'number')
  )
}

/** Purge in-memory recent foods cache to prevent memory leaks or stale state across user sessions. */
export function clearRecentFoodsCache(userKey?: string): void {
  if (userKey) {
    recentFoodsCache.delete(userKey)
    inflightRequests.delete(userKey)
  } else {
    recentFoodsCache.clear()
    inflightRequests.clear()
  }
}

export async function listRecentFoods(userKey: string): Promise<RecentFoodEntry[]> {
  // 1. Check in-memory cache
  const cached = recentFoodsCache.get(userKey)
  if (cached) return cached

  // 2. Deduplicate in-flight AsyncStorage requests
  const inflight = inflightRequests.get(userKey)
  if (inflight) return inflight

  const request = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(userKey))
      if (!raw) {
        recentFoodsCache.set(userKey, [])
        return []
      }
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        recentFoodsCache.set(userKey, [])
        return []
      }
      const entries = parsed
        .filter(isRecentFoodEntry)
        .sort((a, b) => b.usedAt.localeCompare(a.usedAt))
      recentFoodsCache.set(userKey, entries)
      return entries
    } catch {
      recentFoodsCache.set(userKey, [])
      return []
    } finally {
      inflightRequests.delete(userKey)
    }
  })()

  inflightRequests.set(userKey, request)
  return request
}

export async function recordRecentFood(
  userKey: string,
  entry: Omit<RecentFoodEntry, 'usedAt'> & { usedAt?: string },
): Promise<void> {
  const id = entry.id.trim()
  if (!id) return

  const existing = await listRecentFoods(userKey)
  const next: RecentFoodEntry = {
    id,
    barcode: entry.barcode,
    query: entry.query,
    title: entry.title.trim() || id,
    kcal: entry.kcal,
    usedAt: entry.usedAt ?? new Date().toISOString(),
  }

  const updated = [next, ...existing.filter((item) => item.id !== id)].slice(0, MAX_RECENTS)

  // Synchronously update memory cache to serve subsequent reads instantly
  recentFoodsCache.set(userKey, updated)

  try {
    await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(updated))
  } catch (err) {
    console.error('[recentFoods] save failed', err)
  }
}

export async function recordRecentFromProduct(
  userKey: string,
  data: Record<string, unknown>,
  options?: { query?: string; barcode?: string },
): Promise<void> {
  const actual = unwrapProductData(data)
  const barcode = options?.barcode?.trim() || getBarcodeFromProduct(actual)
  const query = options?.query?.trim() || null
  const title = getProductTitle(actual, barcode ? `Barcode ${barcode}` : query ?? 'Food')
  const input = buildMealInputFromProduct('recent', actual, 'Breakfast', barcode ?? '', 1)
  const id = barcode ?? query?.toLowerCase() ?? title.toLowerCase()

  await recordRecentFood(userKey, {
    id,
    barcode: barcode ?? null,
    query: barcode ? null : query,
    title,
    kcal: input.kcal ?? null,
  })
}

export async function recordRecentQuery(userKey: string, query: string): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed) return
  await recordRecentFood(userKey, {
    id: trimmed.toLowerCase(),
    barcode: null,
    query: trimmed,
    title: trimmed,
    kcal: null,
  })
}

export async function clearRecentFoods(userKey?: string): Promise<void> {
  if (!userKey) {
    clearRecentFoodsCache()
    return
  }
  clearRecentFoodsCache(userKey)
  try {
    await AsyncStorage.removeItem(storageKey(userKey))
  } catch (err) {
    console.error('[recentFoods] clear failed', err)
  }
}
