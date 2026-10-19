import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppFontChoice = 'default' | 'custom' | 'mono'

const STORAGE_KEY = '@calcount/app_font_choice'
const VALID_CHOICES: AppFontChoice[] = ['default', 'custom', 'mono']

export const DEFAULT_FONT_CHOICE: AppFontChoice = 'default'

// ⚡ Bolt: In-memory cache, request deduplication, and cache generation tracking
// to eliminate redundant AsyncStorage bridge reads and race conditions.
let cachedFontChoice: AppFontChoice | null = null
let inflightPromise: Promise<AppFontChoice> | null = null
let cacheGeneration = 0

/** Clear any cached font choice and reset inflight promise for session purges. */
export function clearFontPreferencesCache(): void {
  cachedFontChoice = null
  inflightPromise = null
  cacheGeneration += 1
}

export function loadFontChoice(): Promise<AppFontChoice> {
  if (cachedFontChoice !== null) {
    return Promise.resolve(cachedFontChoice)
  }

  if (inflightPromise !== null) {
    return inflightPromise
  }

  const currentGeneration = cacheGeneration

  const promise = (async () => {
    let result = DEFAULT_FONT_CHOICE
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY)
      if (value && VALID_CHOICES.includes(value as AppFontChoice)) {
        result = value as AppFontChoice
      }
    } catch (err) {
      console.error('[fontPreferences] load failed', err)
    }

    if (cacheGeneration === currentGeneration) {
      cachedFontChoice = result
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

export async function saveFontChoice(choice: AppFontChoice): Promise<void> {
  cachedFontChoice = choice
  cacheGeneration += 1
  try {
    await AsyncStorage.setItem(STORAGE_KEY, choice)
  } catch (err) {
    console.error('[fontPreferences] save failed', err)
    throw err
  }
}
