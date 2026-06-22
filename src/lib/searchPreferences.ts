import AsyncStorage from '@react-native-async-storage/async-storage'

export type DefaultSearchMode = 'scan' | 'text_query'

const STORAGE_KEY = '@calcount/default_search_mode'

export const DEFAULT_SEARCH_MODE: DefaultSearchMode = 'scan'

export async function loadDefaultSearchMode(): Promise<DefaultSearchMode> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value === 'scan' || value === 'text_query') return value
  } catch (err) {
    console.error('[searchPreferences] load failed', err)
  }
  return DEFAULT_SEARCH_MODE
}

export async function saveDefaultSearchMode(mode: DefaultSearchMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode)
}
