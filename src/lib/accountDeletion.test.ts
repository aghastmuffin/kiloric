// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'

const {
  mockListDocuments,
  mockDeleteDocument,
  mockDeleteFile,
  mockGetAccount,
} = vi.hoisted(() => {
  return {
    mockListDocuments: vi.fn(),
    mockDeleteDocument: vi.fn(),
    mockDeleteFile: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: {
      listDocuments: mockListDocuments,
      deleteDocument: mockDeleteDocument,
    },
    storage: {
      deleteFile: mockDeleteFile,
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
    Query: {
      equal: (key: string, val: any) => `equal:${key}:${val}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID = 'test-meals-col'
process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID = 'test-water-col'
process.env.EXPO_PUBLIC_APPWRITE_TASKS_DATABASE_ID = 'test-tasks-db'
process.env.EXPO_PUBLIC_APPWRITE_TASKS_COLLECTION_ID = 'test-tasks-col'
process.env.EXPO_PUBLIC_APPWRITE_FOODS_DATABASE_ID = 'test-foods-db'
process.env.EXPO_PUBLIC_APPWRITE_FOOD_CONTRIBUTIONS_COLLECTION_ID = 'test-contributions-col'
process.env.EXPO_PUBLIC_APPWRITE_FOOD_IMAGES_BUCKET_ID = 'test-images-bucket'

let accountDeletionModule: any

beforeAll(async () => {
  accountDeletionModule = await import('./accountDeletion')
})

describe('accountDeletion security & functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws authorization error when purgeAccountData is called for a different user ID (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })

    await expect(accountDeletionModule.purgeAccountData('user_456')).rejects.toThrow(
      'Unauthorized: You are not permitted to modify this profile.',
    )

    expect(mockListDocuments).not.toHaveBeenCalled()
    expect(mockDeleteDocument).not.toHaveBeenCalled()
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  it('purges user contributions, owned documents, and profile when user ID matches authenticated session', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })
    mockListDocuments.mockResolvedValue({ documents: [] })
    mockDeleteDocument.mockResolvedValue({})

    await accountDeletionModule.purgeAccountData('user_123')

    expect(mockListDocuments).toHaveBeenCalled()
    expect(mockDeleteDocument).toHaveBeenCalled()
  })
})
