// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const { mockGetDocument, mockGetAccount } = vi.hoisted(() => {
  return {
    mockGetDocument: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

vi.mock('./serverData', () => {
  return {
    databases: {
      getDocument: mockGetDocument,
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
    },
    account: {
      get: mockGetAccount,
    },
  }
})

vi.mock('@/lib/serverTypes', () => {
  return {
    PersistenceError: class extends Error {
      code: number
      type: string
      constructor(message: string, code: number, type: string) {
        super(message)
        this.code = code
        this.type = type
      }
    },
    Permission: {
      read: () => 'read',
      update: () => 'update',
      delete: () => 'delete',
    },
    Role: {
      user: (id: string) => `user:${id}`,
    },
  }
})


let profileModule: any

beforeAll(async () => {
  profileModule = await import('./profile')
})

describe('profile lib security & functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileModule.clearProfileCache()
  })

  it('throws authorization error when getProfile is called for a different user ID (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })

    await expect(profileModule.getProfile('user_456')).rejects.toThrow(
      'Unauthorized: You are not permitted to modify this profile.',
    )
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('fetches profile successfully when requested user ID matches authenticated user ID', async () => {
    const mockProfile = {
      $id: 'user_123',
      username: 'TestUser',
      email: 'test@example.com',
      dateOfBirth: '1990-01-01',
      weight: 70,
      height: 175,
      role: 'user',
    }

    mockGetAccount.mockResolvedValue({ $id: 'user_123' })
    mockGetDocument.mockResolvedValue(mockProfile)

    const result = await profileModule.getProfile('user_123')

    expect(result).toEqual(mockProfile)
    expect(mockGetDocument).toHaveBeenCalledTimes(1)
  })

  it('uses cached profile on subsequent calls for the same user ID within TTL', async () => {
    const mockProfile = {
      $id: 'user_123',
      username: 'TestUser',
      email: 'test@example.com',
      dateOfBirth: '1990-01-01',
      weight: 70,
      height: 175,
      role: 'user',
    }

    mockGetAccount.mockResolvedValue({ $id: 'user_123' })
    mockGetDocument.mockResolvedValue(mockProfile)

    const first = await profileModule.getProfile('user_123')
    const second = await profileModule.getProfile('user_123')

    expect(first).toBe(mockProfile)
    expect(second).toBe(mockProfile)
    expect(mockGetDocument).toHaveBeenCalledTimes(1)
  })

  describe('parseProfileDate & dateToIso', () => {
    it('parses stored ISO datetime string into local Date matching original YYYY-MM-DD components', () => {
      // 1990-06-15 stored as midnight UTC
      const isoString = '1990-06-15T00:00:00.000+00:00'
      const parsed = profileModule.parseProfileDate(isoString)

      expect(parsed.getFullYear()).toBe(1990)
      expect(parsed.getMonth()).toBe(5) // June (0-indexed)
      expect(parsed.getDate()).toBe(15)
    })

    it('parses plain YYYY-MM-DD date string', () => {
      const parsed = profileModule.parseProfileDate('1990-06-15')

      expect(parsed.getFullYear()).toBe(1990)
      expect(parsed.getMonth()).toBe(5)
      expect(parsed.getDate()).toBe(15)
    })

    it('falls back to default date on undefined or invalid date string', () => {
      const fallback = profileModule.parseProfileDate(undefined)
      expect(fallback).toEqual(profileModule.DEFAULT_DATE_OF_BIRTH)

      const invalidFallback = profileModule.parseProfileDate('invalid-date-string')
      expect(invalidFallback).toEqual(profileModule.DEFAULT_DATE_OF_BIRTH)
    })

    it('round-trips parseProfileDate and dateToIso without drifting days', () => {
      const originalIso = '1990-06-15T00:00:00.000+00:00'

      let currentIso = originalIso
      for (let i = 0; i < 5; i += 1) {
        const parsed = profileModule.parseProfileDate(currentIso)
        currentIso = profileModule.dateToIso(parsed)
        expect(currentIso).toBe(originalIso)
      }
    })
  })

  it('times out after 10 seconds and clears inflight cache when document request hangs', async () => {
    vi.useFakeTimers()
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })
    mockGetDocument.mockImplementation(() => new Promise(() => {}))

    const promise = profileModule.getProfile('user_123')

    vi.advanceTimersByTime(10001)

    await expect(promise).rejects.toThrow('Profile load timed out. Please try again.')

    // Verify that subsequent calls attempt a new request because inflight promise was cleared
    mockGetDocument.mockResolvedValue({
      $id: 'user_123',
      username: 'TestUser',
    })

    vi.useRealTimers()

    const retryResult = await profileModule.getProfile('user_123')
    expect(retryResult).toEqual({ $id: 'user_123', username: 'TestUser' })
  })

  it('clears inflight cache on request rejection so retries can occur', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })
    mockGetDocument.mockRejectedValueOnce(new Error('Network failure'))

    await expect(profileModule.getProfile('user_123')).rejects.toThrow('Network failure')

    mockGetDocument.mockResolvedValueOnce({
      $id: 'user_123',
      username: 'RecoveredUser',
    })

    const result = await profileModule.getProfile('user_123')
    expect(result).toEqual({ $id: 'user_123', username: 'RecoveredUser' })
  })
})