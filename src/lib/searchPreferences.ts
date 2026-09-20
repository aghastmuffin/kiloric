import AsyncStorage from '@react-native-async-storage/async-storage'

export type DefaultSearchMode = 'scan' | 'text_query'

const STORAGE_KEY = '@calcount/default_search_mode'

export const DEFAULT_SEARCH_MODE: DefaultSearchMode = 'scan'

// In-memory cache for search mode preference to prevent redundant AsyncStorage I/O reads.
let cachedSearchMode: DefaultSearchMode | null = null
let inflightRequest: Promise<DefaultSearchMode> | null = null

export function clearSearchPreferencesCache(): void {
  cachedSearchMode = null
  inflightRequest = null
}

export function loadDefaultSearchMode(): Promise<DefaultSearchMode> {
  // 1. Return in-memory cached search mode if available
  if (cachedSearchMode !== null) {
    return Promise.resolve(cachedSearchMode)
  }

  // 2. Deduplicate in-flight AsyncStorage requests
  if (inflightRequest) {
    return inflightRequest
  }

  inflightRequest = (async () => {
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
  })().finally(() => {
    inflightRequest = null
  })

  return inflightRequest
}

export async function saveDefaultSearchMode(mode: DefaultSearchMode): Promise<void> {
  cachedSearchMode = mode
  await AsyncStorage.setItem(STORAGE_KEY, mode)
}
