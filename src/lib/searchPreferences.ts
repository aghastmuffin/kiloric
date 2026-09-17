import AsyncStorage from '@react-native-async-storage/async-storage'

export type DefaultSearchMode = 'scan' | 'text_query'

const STORAGE_KEY = '@calcount/default_search_mode'

export const DEFAULT_SEARCH_MODE: DefaultSearchMode = 'scan'

// ⚡ Bolt: In-memory cache and request deduplication promise to eliminate redundant AsyncStorage bridge reads.
let cachedSearchMode: DefaultSearchMode | null = null
let inflightRequest: Promise<DefaultSearchMode> | null = null

/** Reset in-memory search preferences cache to prevent stale state across sessions. */
export function clearSearchPreferencesCache(): void {
  cachedSearchMode = null
  inflightRequest = null
}

export async function loadDefaultSearchMode(): Promise<DefaultSearchMode> {
  if (cachedSearchMode !== null) return cachedSearchMode
  if (inflightRequest !== null) return inflightRequest

  inflightRequest = (async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY)
      if (value === 'scan' || value === 'text_query') {
        cachedSearchMode = value
        return value
      }
    } catch (err) {
      console.error('[searchPreferences] load failed', err)
    } finally {
      inflightRequest = null
    }
    cachedSearchMode = DEFAULT_SEARCH_MODE
    return DEFAULT_SEARCH_MODE
  })()

  return inflightRequest
}

export async function saveDefaultSearchMode(mode: DefaultSearchMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode)
  cachedSearchMode = mode
}
