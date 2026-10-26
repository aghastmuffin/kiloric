import { beforeEach, expect, it, vi } from 'vitest'

const { mockGetSessionAccessToken } = vi.hoisted(() => ({ mockGetSessionAccessToken: vi.fn() }))
vi.mock('./apiClient', () => ({ getAccessToken: mockGetSessionAccessToken }))

import { getAccessToken } from './getAccessToken'

beforeEach(() => vi.clearAllMocks())

it('returns the current server bearer token', async () => {
  mockGetSessionAccessToken.mockResolvedValue('server-token')
  await expect(getAccessToken()).resolves.toBe('server-token')
  expect(mockGetSessionAccessToken).toHaveBeenCalledTimes(1)
})

it('returns null when there is no signed-in session', async () => {
  mockGetSessionAccessToken.mockResolvedValue(null)
  await expect(getAccessToken()).resolves.toBeNull()
})
