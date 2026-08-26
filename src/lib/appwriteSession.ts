import AsyncStorage from '@react-native-async-storage/async-storage'
import { client } from './appwrite'
import type { Models } from 'react-native-appwrite'
import { clearFavoriteFoodsCache } from './foodFavorites'
import { clearCachedToken } from './getAccessToken'
import { clearTodayMealsCache } from './meals'
import { clearProfileCache } from './profile'
import { clearRecentFoodsCache } from './recentFoods'
import { clearTasksCache } from './tasks'
import { clearWaterCache } from './water'

const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? 'default'

function sessionStorageKey(): string {
  return `appwrite_session_${projectId}`
}

/** Attach the Appwrite session secret to the shared client (required for DB calls on native). */
export function applyAppwriteSession(sessionSecret: string): void {
  client.setSession(sessionSecret)
}

function clearSessionCaches(): void {
  clearCachedToken()
  clearProfileCache()
  clearRecentFoodsCache()
  clearTasksCache()
  clearTodayMealsCache()
  clearFavoriteFoodsCache()
  clearWaterCache()
}

export async function persistAppwriteSession(session: Models.Session): Promise<void> {
  clearSessionCaches()
  if (!session.secret) return
  applyAppwriteSession(session.secret)
  await AsyncStorage.setItem(sessionStorageKey(), session.secret)
}

export async function restoreAppwriteSession(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(sessionStorageKey())
  if (!stored) return false
  applyAppwriteSession(stored)
  return true
}

export async function clearAppwriteSession(): Promise<void> {
  client.setSession('')
  clearSessionCaches()
  await AsyncStorage.removeItem(sessionStorageKey())
}
