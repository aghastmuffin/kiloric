import AsyncStorage from '@react-native-async-storage/async-storage'

export type DefaultSearchMode = 'scan' | 'text_query'

const STORAGE_KEY = '@calcount/default_search_mode'

export const DEFAULT_SEARCH_MODE: DefaultSearchMode = 'scan'

// ⚡ Bolt: In-memory cache and promise deduplication for search preferences
// to eliminate redundant AsyncStorage bridge reads across components and renders.
let cachedDefaultSearchMode: DefaultSearchMode | null = null
let inflightDefaultSearchModePromise: Promise<DefaultSearchMode> | null = null
let cacheGeneration = 0

/** Clear in-memory cache and inflight request promise. Useful for testing and session purges. */
export function clearSearchPreferencesCache(): void {
  cachedDefaultSearchMode = null
  inflightDefaultSearchModePromise = null
  cacheGeneration += 1
}

export function loadDefaultSearchMode(): Promise<DefaultSearchMode> {
  if (cachedDefaultSearchMode !== null) {
    return Promise.resolve(cachedDefaultSearchMode)
  }

  if (inflightDefaultSearchModePromise) {
    return inflightDefaultSearchModePromise
  }

  const currentGeneration = cacheGeneration

  const request = (async () => {
    let mode: DefaultSearchMode = DEFAULT_SEARCH_MODE
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY)
      if (value === 'scan' || value === 'text_query') {
        mode = value
      }
    } catch (err) {
      console.error('[searchPreferences] load failed', err)
    }

    // Only update cache if no save or clear mutation occurred during the in-flight request
    if (cacheGeneration === currentGeneration) {
      cachedDefaultSearchMode = mode
    }

    return cachedDefaultSearchMode ?? mode
  })()

  inflightDefaultSearchModePromise = request
  request.finally(() => {
    if (inflightDefaultSearchModePromise === request) {
      inflightDefaultSearchModePromise = null
    }
  })

  return request
}

export async function saveDefaultSearchMode(mode: DefaultSearchMode): Promise<void> {
  cacheGeneration += 1
  cachedDefaultSearchMode = mode
  await AsyncStorage.setItem(STORAGE_KEY, mode)
}
