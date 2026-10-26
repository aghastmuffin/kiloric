import { beforeEach, expect, it, vi } from 'vitest'

const { mockGetAccount, mockDelete } = vi.hoisted(() => ({
  mockGetAccount: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('./serverData', () => ({ account: { get: mockGetAccount } }))
vi.mock('./apiClient', () => ({ apiClient: { delete: mockDelete } }))

import { purgeAccountData } from './accountDeletion'

beforeEach(() => vi.clearAllMocks())

it('rejects deletion for a different signed-in user', async () => {
  mockGetAccount.mockResolvedValue({ $id: 'user-123' })
  await expect(purgeAccountData('user-456')).rejects.toThrow('Unauthorized')
  expect(mockDelete).not.toHaveBeenCalled()
})

it('uses the server account cascade for the signed-in user', async () => {
  mockGetAccount.mockResolvedValue({ $id: 'user-123' })
  mockDelete.mockResolvedValue(undefined)
  await purgeAccountData('user-123')
  expect(mockDelete).toHaveBeenCalledWith('/v1/me')
})
