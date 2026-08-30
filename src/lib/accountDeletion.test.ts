// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'

const {
  mockListDocuments,
  mockDeleteDocument,
  mockGetAccount,
  mockDeleteFile,
  mockGetDocument,
} = vi.hoisted(() => {
  return {
    mockListDocuments: vi.fn(),
    mockDeleteDocument: vi.fn(),
    mockGetAccount: vi.fn(),
    mockDeleteFile: vi.fn(),
    mockGetDocument: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: {
      listDocuments: mockListDocuments,
      deleteDocument: mockDeleteDocument,
      getDocument: mockGetDocument,
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
process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID = 'test-profiles-col'

let purgeAccountData: (userId: string) => Promise<void>

beforeAll(async () => {
  const accountDeletionModule = await import('./accountDeletion')
  purgeAccountData = accountDeletionModule.purgeAccountData
})

describe('accountDeletion security & functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws authorization error when purgeAccountData is called for a different user ID (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })

    await expect(purgeAccountData('user_456')).rejects.toThrow(
      'Unauthorized: You are not permitted to modify this profile.',
    )

    expect(mockListDocuments).not.toHaveBeenCalled()
    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('successfully purges account data when user ID matches authenticated user', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123' })

    // Simulate returning documents then empty lists to terminate deletion loops
    mockListDocuments
      .mockResolvedValueOnce({
        documents: [{ $id: 'contrib_1', photo_file_id: 'photo_1' }],
      })
      .mockResolvedValueOnce({ documents: [] }) // end deleteContributions loop
      .mockResolvedValueOnce({ documents: [{ $id: 'meal_1' }] }) // meals
      .mockResolvedValueOnce({ documents: [] }) // end meals loop
      .mockResolvedValueOnce({ documents: [] }) // water
      .mockResolvedValueOnce({ documents: [] }) // tasks

    mockDeleteFile.mockResolvedValue({})
    mockDeleteDocument.mockResolvedValue({})

    await purgeAccountData('user_123')

    expect(mockDeleteFile).toHaveBeenCalledWith({
      bucketId: expect.any(String),
      fileId: 'photo_1',
    })
    expect(mockDeleteDocument).toHaveBeenCalledWith({
      databaseId: 'test-db',
      collectionId: 'test-profiles-col',
      documentId: 'user_123',
    })
  })
})
