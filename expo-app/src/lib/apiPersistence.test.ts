import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('react-native-appwrite', () => ({ AppwriteException: class extends Error {} }))
vi.mock('./apiClient', () => ({
  ApiError: class extends Error {}, getAccessToken: vi.fn(),
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
import { apiClient } from './apiClient'
import { apiAccount, createApiDatabases } from './apiPersistence'
import type { Databases } from 'react-native-appwrite'
beforeEach(() => vi.clearAllMocks())
it('routes feature data to the same API session as auth', async () => {
  const databases = createApiDatabases({} as Databases)
  await databases.listDocuments({ databaseId: 'db', collectionId: 'water_logs', queries: ['filter'] })
  expect(apiClient.get).toHaveBeenCalledWith('/v1/water', { queries: '["filter"]' })
  await databases.createDocument({ databaseId: 'db', collectionId: 'users', documentId: 'user', data: { weight: 70 } })
  expect(apiClient.patch).toHaveBeenCalledWith('/v1/me', { weight: 70 })
  await apiAccount.getPrefs()
  expect(apiClient.get).toHaveBeenCalledWith('/v1/me/prefs')
})
