import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppFontChoice = 'default' | 'custom' | 'mono'

const STORAGE_KEY = '@calcount/app_font_choice'
const VALID_CHOICES: AppFontChoice[] = ['default', 'custom', 'mono']

export const DEFAULT_FONT_CHOICE: AppFontChoice = 'default'

export async function loadFontChoice(): Promise<AppFontChoice> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (VALID_CHOICES.includes(value as AppFontChoice)) return value as AppFontChoice
  } catch (err) {
    console.error('[fontPreferences] load failed', err)
  }
  return DEFAULT_FONT_CHOICE
}

export async function saveFontChoice(choice: AppFontChoice): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, choice)
}
