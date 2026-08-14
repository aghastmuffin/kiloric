// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import { localDayBounds, totalWaterMl } from './waterUtils'

const {
  mockListDocuments,
  mockCreateDocument,
  mockDeleteDocument,
  mockGetDocument,
  mockGetAccount,
} = vi.hoisted(() => {
  return {
    mockListDocuments: vi.fn(),
    mockCreateDocument: vi.fn(),
    mockDeleteDocument: vi.fn(),
    mockGetDocument: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: {
      listDocuments: mockListDocuments,
      createDocument: mockCreateDocument,
      deleteDocument: mockDeleteDocument,
      getDocument: mockGetDocument,
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
    ID: {
      unique: () => 'mock-unique-id',
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
      greaterThanEqual: (key: string, val: any) => `gte:${key}:${val}`,
      lessThan: (key: string, val: any) => `lt:${key}:${val}`,
      orderDesc: (key: string) => `orderDesc:${key}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

// Set up environment variables
process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID = 'test-water-col'

// Dynamically import the module to prevent premature evaluation of dependencies
let waterModule: any

beforeAll(async () => {
  waterModule = await import('./water')
})

describe('water utils', () => {
  it('groups entries into local calendar days', () => {
    const date = new Date(2026, 6, 9, 15, 30)
    const { start, end } = localDayBounds(date)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6)
    expect(start.getDate()).toBe(9)
    expect(start.getHours()).toBe(0)
    expect(end.getDate()).toBe(10)
    expect(end.getHours()).toBe(0)
  })

  it('sums valid water amounts and ignores invalid rows', () => {
    expect(
      totalWaterMl([
        { amount_ml: 250 },
        { amount_ml: 500 },
        { amount_ml: 10 },
        { amount_ml: Number.NaN },
      ]),
    ).toBe(750)
  })
})

describe('water appwrite services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deleteWaterEntry BOLA/IDOR protection', () => {
    it('throws error if the active user ID does not match requested userId', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        waterModule.deleteWaterEntry('user-456', 'doc-123')
      ).rejects.toThrow('You can only change your own water log.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('throws error if the document ID contains invalid characters', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        waterModule.deleteWaterEntry('user-123', 'invalid/doc/id')
      ).rejects.toThrow('Invalid water entry.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('throws error if water entry is not found', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      const AppwriteException = (await import('react-native-appwrite')).AppwriteException
      mockGetDocument.mockRejectedValue(new AppwriteException('Document not found', 404, 'document_not_found'))

      await expect(
        waterModule.deleteWaterEntry('user-123', 'doc-123')
      ).rejects.toThrow('Water entry not found.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('throws error if the active user is not the owner of the water entry (BOLA/IDOR protection)', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'doc-123',
        owner: 'user-456',
        amount_ml: 250,
      })

      await expect(
        waterModule.deleteWaterEntry('user-123', 'doc-123')
      ).rejects.toThrow('Unauthorized: You can only delete your own water logs.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('successfully deletes water entry when user is the owner', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'doc-123',
        owner: 'user-123',
        amount_ml: 250,
      })
      mockDeleteDocument.mockResolvedValue({})

      await expect(
        waterModule.deleteWaterEntry('user-123', 'doc-123')
      ).resolves.not.toThrow()

      expect(mockGetDocument).toHaveBeenCalledWith({
        databaseId: expect.any(String),
        collectionId: expect.any(String),
        documentId: 'doc-123',
      })
      expect(mockDeleteDocument).toHaveBeenCalledWith({
        databaseId: expect.any(String),
        collectionId: expect.any(String),
        documentId: 'doc-123',
      })
    })
  })
})
