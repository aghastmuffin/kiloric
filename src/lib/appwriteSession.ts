import AsyncStorage from '@react-native-async-storage/async-storage'
import { client } from '@/lib/appwrite'
import type { Models } from 'react-native-appwrite'
import { clearCachedToken } from './getAccessToken'
import { clearProfileCache } from './profile'
import { clearRecentFoodsCache } from './recentFoods'

const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? 'default'

function sessionStorageKey(): string {
  return `appwrite_session_${projectId}`
}

/** Attach the Appwrite session secret to the shared client (required for DB calls on native). */
export function applyAppwriteSession(sessionSecret: string): void {
  client.setSession(sessionSecret)
}

export async function persistAppwriteSession(session: Models.Session): Promise<void> {
  if (!session.secret) return
  applyAppwriteSession(session.secret)
  await AsyncStorage.setItem(sessionStorageKey(), session.secret)
  clearCachedToken()
  clearProfileCache()
  clearRecentFoodsCache()
}

export async function restoreAppwriteSession(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(sessionStorageKey())
  if (!stored) return false
  applyAppwriteSession(stored)
  return true
}

export async function clearAppwriteSession(): Promise<void> {
  client.setSession('')
  await AsyncStorage.removeItem(sessionStorageKey())
  clearCachedToken()
  clearProfileCache()
  clearRecentFoodsCache()
}
