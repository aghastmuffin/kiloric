import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppFontChoice = 'default' | 'custom'

const STORAGE_KEY = '@calcount/app_font_choice'

export const DEFAULT_FONT_CHOICE: AppFontChoice = 'default'

export async function loadFontChoice(): Promise<AppFontChoice> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value === 'default' || value === 'custom') return value
  } catch (err) {
    console.error('[fontPreferences] load failed', err)
  }
  return DEFAULT_FONT_CHOICE
}

export async function saveFontChoice(choice: AppFontChoice): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, choice)
}
