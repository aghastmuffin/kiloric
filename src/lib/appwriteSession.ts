import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { Models } from 'react-native-appwrite'
import { client } from './appwrite'
import { clearFavoriteFoodsCache } from './foodFavorites'
import { clearCachedToken } from './getAccessToken'
import { clearMealTypePreferencesCache } from './mealTypePreferences'
import { clearTodayMealsCache } from './meals'
import { clearProfileCache } from './profile'
import { clearTasksCache } from './tasks'
import { clearWaterCache } from './water'

const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? 'default'

function sessionStorageKey(): string {
  return `appwrite_session_${projectId}`
}

/** Web keeps the Appwrite cookie session. Native has no document and uses SecureStore. */
function persistsSessionSecret(): boolean {
  return typeof document === 'undefined'
}

/** Attach the Appwrite session secret to the shared client (required for DB calls on native). */
export function applyAppwriteSession(sessionSecret: string): void {
  client.setSession(sessionSecret)
}

function clearSessionCaches(): void {
  clearCachedToken()
  clearProfileCache()
  clearTasksCache()
  clearTodayMealsCache()
  clearFavoriteFoodsCache()
  clearWaterCache()
  clearMealTypePreferencesCache()
}

async function migrateLegacySecret(): Promise<string | null> {
  const legacy = await AsyncStorage.getItem(sessionStorageKey())
  if (!legacy) return null
  await SecureStore.setItemAsync(sessionStorageKey(), legacy)
  await AsyncStorage.removeItem(sessionStorageKey())
  return legacy
}

/** Native keeps the session secret in SecureStore. Web relies on the cookie session. */
export async function persistAppwriteSession(session: Models.Session): Promise<void> {
  clearSessionCaches()
  if (!session.secret) return
  applyAppwriteSession(session.secret)
  if (!persistsSessionSecret()) return
  await SecureStore.setItemAsync(sessionStorageKey(), session.secret)
  await AsyncStorage.removeItem(sessionStorageKey())
}

export async function restoreAppwriteSession(): Promise<boolean> {
  if (!persistsSessionSecret()) return false
  const stored = (await SecureStore.getItemAsync(sessionStorageKey())) ?? (await migrateLegacySecret())
  if (!stored) return false
  applyAppwriteSession(stored)
  return true
}

export async function clearAppwriteSession(): Promise<void> {
  client.setSession('')
  clearSessionCaches()
  if (!persistsSessionSecret()) return
  await SecureStore.deleteItemAsync(sessionStorageKey())
  await AsyncStorage.removeItem(sessionStorageKey())
}
