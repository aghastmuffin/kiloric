// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const { mockGetDocument, mockGetAccount } = vi.hoisted(() => {
  return {
    mockGetDocument: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
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

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {
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

process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID = 'test-profiles-col'

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
})
