import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AppThemeChoice } from '@/lib/theme/tokens'

const STORAGE_KEY = '@calcount/app_theme_choice'

export const DEFAULT_THEME_CHOICE: AppThemeChoice = 'night'

export async function loadThemeChoice(): Promise<AppThemeChoice> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value === 'paper' || value === 'light') return 'paper'
    if (value === 'night' || value === 'dark') return 'night'
  } catch (err) {
    console.error('[themePreferences] load failed', err)
  }
  return DEFAULT_THEME_CHOICE
}

export async function saveThemeChoice(choice: AppThemeChoice): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, choice)
}
