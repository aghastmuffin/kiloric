import AsyncStorage from '@react-native-async-storage/async-storage'

export type DefaultSearchMode = 'scan' | 'text_query'

const STORAGE_KEY = '@calcount/default_search_mode'

export const DEFAULT_SEARCH_MODE: DefaultSearchMode = 'scan'

// In-memory cache and inflight request promise to eliminate redundant AsyncStorage bridge reads and deduplicate concurrent calls.
let cachedSearchMode: DefaultSearchMode | null = null
let inflightSearchModePromise: Promise<DefaultSearchMode> | null = null

/**
 * Clear in-memory search preferences cache.
 * Useful on session logout or in tests to avoid stale state.
 */
export function clearSearchPreferencesCache(): void {
  cachedSearchMode = null
  inflightSearchModePromise = null
}

export function loadDefaultSearchMode(): Promise<DefaultSearchMode> {
  // 1. Fast path: return in-memory cached search preference instantly
  if (cachedSearchMode !== null) {
    return Promise.resolve(cachedSearchMode)
  }

  // 2. Deduplicate concurrent reads while storage fetch is inflight
  if (inflightSearchModePromise) {
    return inflightSearchModePromise
  }

  const request = (async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY)
      if (value === 'scan' || value === 'text_query') {
        cachedSearchMode = value
        return value
      }
    } catch (err) {
      console.error('[searchPreferences] load failed', err)
    }
    cachedSearchMode = DEFAULT_SEARCH_MODE
    return DEFAULT_SEARCH_MODE
  })()

  inflightSearchModePromise = request
  request.finally(() => {
    if (inflightSearchModePromise === request) {
      inflightSearchModePromise = null
    }
  })

  return request
}

export async function saveDefaultSearchMode(mode: DefaultSearchMode): Promise<void> {
  // Synchronously update in-memory cache to serve subsequent reads with zero latency
  cachedSearchMode = mode
  await AsyncStorage.setItem(STORAGE_KEY, mode)
}
