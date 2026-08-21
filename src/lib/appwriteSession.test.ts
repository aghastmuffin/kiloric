// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { client } from '@/lib/appwrite'
import { clearFavoriteFoodsCache } from './foodFavorites'
import { clearCachedToken } from './getAccessToken'
import { clearProfileCache } from './profile'
import { clearAppwriteSession, persistAppwriteSession } from './appwriteSession'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/lib/appwrite', () => ({
  client: {
    setSession: vi.fn(),
  },
}))

vi.mock('./getAccessToken', () => ({
  clearCachedToken: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock('./profile', () => ({
  clearProfileCache: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('./foodFavorites', () => ({
  clearFavoriteFoodsCache: vi.fn(),
  loadFavoriteFoods: vi.fn(),
}))

describe('appwriteSession cache clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persistAppwriteSession should apply session, save to storage, and clear caches', async () => {
    const mockSession = {
      $id: 'session-123',
      $createdAt: '2025-01-01',
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
      deviceBrand: 'Apple',
      deviceModel: 'iPhone',
      deviceName: 'iPhone',
      deviceSubtype: 'phone',
      countryCode: 'US',
      countryName: 'United States',
      current: true,
      secret: 'my-session-secret',
    }

    await persistAppwriteSession(mockSession)

    expect(client.setSession).toHaveBeenCalledWith('my-session-secret')
    expect(AsyncStorage.setItem).toHaveBeenCalled()
    expect(clearCachedToken).toHaveBeenCalled()
    expect(clearProfileCache).toHaveBeenCalled()
    expect(clearFavoriteFoodsCache).toHaveBeenCalled()
  })

  it('clearAppwriteSession should clear client session, remove from storage, and clear caches', async () => {
    await clearAppwriteSession()

    expect(client.setSession).toHaveBeenCalledWith('')
    expect(AsyncStorage.removeItem).toHaveBeenCalled()
    expect(clearCachedToken).toHaveBeenCalled()
    expect(clearProfileCache).toHaveBeenCalled()
    expect(clearFavoriteFoodsCache).toHaveBeenCalled()
  })
})
