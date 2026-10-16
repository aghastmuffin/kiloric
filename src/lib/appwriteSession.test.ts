// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Models } from 'react-native-appwrite'
import { client } from './appwrite'
import { clearFavoriteFoodsCache } from './foodFavorites'
import { clearCachedToken } from './getAccessToken'
import { clearTodayMealsCache } from './meals'
import { clearProfileCache } from './profile'
import { clearMealTypePreferencesCache } from './mealTypePreferences'
import { clearTasksCache } from './tasks'
import { clearWaterCache } from './water'
import * as SecureStore from 'expo-secure-store'
import { clearAppwriteSession, persistAppwriteSession, restoreAppwriteSession } from './appwriteSession'

vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(() => Promise.resolve()),
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('./appwrite', () => ({
  client: {
    setSession: vi.fn(),
  },
}))

vi.mock('./getAccessToken', () => ({
  clearCachedToken: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock('./foodFavorites', () => ({
  clearFavoriteFoodsCache: vi.fn(),
}))

vi.mock('./meals', () => ({
  clearTodayMealsCache: vi.fn(),
}))

vi.mock('./profile', () => ({
  clearProfileCache: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('./mealTypePreferences', () => ({
  clearMealTypePreferencesCache: vi.fn(),
}))

vi.mock('./tasks', () => ({
  clearTasksCache: vi.fn(),
}))

vi.mock('./water', () => ({
  clearWaterCache: vi.fn(),
}))

describe('appwriteSession cache clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persistAppwriteSession should apply session, save to storage, and clear caches', async () => {
    const mockSession = {
      $id: 'session-123',
      $createdAt: '2025-01-01',
      $updatedAt: '2025-01-01',
      userId: 'user-123',
      expire: '2025-01-02',
      provider: 'email',
      providerUid: 'email@example.com',
      providerAccessToken: 'token',
      providerAccessTokenExpiry: '2025-01-02',
      providerRefreshToken: 'refresh',
      ip: '127.0.0.1',
      osCode: 'ios',
      osName: 'iOS',
      osVersion: '16',
      clientType: 'app',
      clientCode: 'expo',
      clientName: 'Expo',
      clientVersion: '1.0',
      clientEngine: 'JavaScriptCore',
      clientEngineVersion: '1.0',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone',
      deviceName: 'iPhone',
      countryCode: 'US',
      countryName: 'United States',
      current: true,
      factors: [],
      secret: 'my-session-secret',
      mfaUpdatedAt: '',
    } satisfies Models.Session

    await persistAppwriteSession(
      mockSession as unknown as Parameters<typeof persistAppwriteSession>[0],
    )

    expect(client.setSession).toHaveBeenCalledWith('my-session-secret')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('appwrite_session_'),
      'my-session-secret',
    )
    expect(AsyncStorage.setItem).not.toHaveBeenCalled()
    expect(AsyncStorage.removeItem).toHaveBeenCalled()
    expect(clearCachedToken).toHaveBeenCalled()
    expect(clearProfileCache).toHaveBeenCalled()
    expect(clearTasksCache).toHaveBeenCalled()
    expect(clearTodayMealsCache).toHaveBeenCalledWith()
    expect(clearFavoriteFoodsCache).toHaveBeenCalled()
    expect(clearWaterCache).toHaveBeenCalledWith()
    expect(clearMealTypePreferencesCache).toHaveBeenCalled()
  })

  it('clears caches for secretless web sessions before returning', async () => {
    await persistAppwriteSession({
      userId: 'user-123',
      secret: '',
    } as unknown as Parameters<typeof persistAppwriteSession>[0])

    expect(client.setSession).not.toHaveBeenCalled()
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
    expect(AsyncStorage.setItem).not.toHaveBeenCalled()
    expect(clearCachedToken).toHaveBeenCalled()
    expect(clearTodayMealsCache).toHaveBeenCalledWith()
    expect(clearFavoriteFoodsCache).toHaveBeenCalled()
    expect(clearWaterCache).toHaveBeenCalledWith()
    expect(clearMealTypePreferencesCache).toHaveBeenCalled()
  })

  it('clearAppwriteSession should clear client session, remove from storage, and clear caches', async () => {
    await clearAppwriteSession()

    expect(client.setSession).toHaveBeenCalledWith('')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled()
    expect(AsyncStorage.removeItem).toHaveBeenCalled()
    expect(clearCachedToken).toHaveBeenCalled()
    expect(clearProfileCache).toHaveBeenCalled()
    expect(clearTasksCache).toHaveBeenCalled()
    expect(clearTodayMealsCache).toHaveBeenCalledWith()
    expect(clearFavoriteFoodsCache).toHaveBeenCalled()
    expect(clearWaterCache).toHaveBeenCalledWith()
    expect(clearMealTypePreferencesCache).toHaveBeenCalled()
  })

  it('does not persist the session secret in a browser document', async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {},
    })
    try {
      await persistAppwriteSession({
        userId: 'user-123',
        secret: 'web-secret',
      } as unknown as Parameters<typeof persistAppwriteSession>[0])
      await expect(restoreAppwriteSession()).resolves.toBe(false)
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
      expect(client.setSession).toHaveBeenCalledWith('web-secret')
    } finally {
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor)
      } else {
        delete (globalThis as { document?: unknown }).document
      }
    }
  })
})
