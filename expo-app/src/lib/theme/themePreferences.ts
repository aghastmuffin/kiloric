import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AppThemeChoice } from '@/lib/theme/tokens'

const STORAGE_KEY = '@kiloric/app_theme_choice'

export const DEFAULT_THEME_CHOICE: AppThemeChoice = 'kiloric'

const VALID_THEMES: AppThemeChoice[] = ['kiloric', 'paper', 'ios', 'barebones']

// ⚡ Bolt: In-memory cache, request deduplication, and cache generation tracking
// to eliminate redundant AsyncStorage bridge reads and race conditions.
let cachedThemeChoice: AppThemeChoice | null = null
let inflightPromise: Promise<AppThemeChoice> | null = null
let cacheGeneration = 0

/** Clear any cached theme choice and reset inflight promise for session purges. */
export function clearThemePreferencesCache(): void {
  cachedThemeChoice = null
  inflightPromise = null
  cacheGeneration += 1
}

export function loadThemeChoice(): Promise<AppThemeChoice> {
  if (cachedThemeChoice !== null) {
    return Promise.resolve(cachedThemeChoice)
  }

  if (inflightPromise !== null) {
    return inflightPromise
  }

  const currentGeneration = cacheGeneration

  const promise = (async () => {
    let result = DEFAULT_THEME_CHOICE
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY)
      if (value && VALID_THEMES.includes(value as AppThemeChoice)) {
        result = value as AppThemeChoice
      }
    } catch (err) {
      console.error('[themePreferences] load failed', err)
    }

    if (cacheGeneration === currentGeneration) {
      cachedThemeChoice = result
    }
    return result
  })()

  inflightPromise = promise

  promise.finally(() => {
    if (inflightPromise === promise) {
      inflightPromise = null
    }
  })

  return promise
}

export async function saveThemeChoice(choice: AppThemeChoice): Promise<void> {
  cachedThemeChoice = choice
  cacheGeneration += 1
  try {
    await AsyncStorage.setItem(STORAGE_KEY, choice)
  } catch (err) {
    console.error('[themePreferences] save failed', err)
    throw err
  }
}
