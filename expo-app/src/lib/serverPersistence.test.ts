import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('./apiClient', () => ({
  ApiError: class extends Error {},
  getAccessToken: vi.fn(),
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from './apiClient'
import { account, database } from './serverPersistence'

beforeEach(() => vi.clearAllMocks())

it('routes feature data through the Kiloric API', async () => {
  await database.listDocuments({ collectionId: 'water_logs', queries: ['filter'] })
  expect(apiClient.get).toHaveBeenCalledWith('/v1/water', { queries: '["filter"]' })

  await database.createDocument({ collectionId: 'users', documentId: 'user', data: { weight: 70 } })
  expect(apiClient.patch).toHaveBeenCalledWith('/v1/me', { weight: 70 })

  await account.getPrefs()
  expect(apiClient.get).toHaveBeenCalledWith('/v1/me/prefs')
})

it('keeps profile reads and updates on the current-user endpoint', async () => {
  await database.getDocument({ collectionId: 'users', documentId: 'user-123' })
  expect(apiClient.get).toHaveBeenCalledWith('/v1/me')

  await database.updateDocument({ collectionId: 'users', documentId: 'user-123', data: { weight: 71 } })
  expect(apiClient.patch).toHaveBeenCalledWith('/v1/me', { weight: 71 })
})
