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

process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID = 'test-water-col'

let waterModule: any

beforeAll(async () => {
  waterModule = await import('./water')
})

describe('water', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  describe('listWaterEntries caching and request deduplication', () => {
    beforeEach(() => {
      waterModule.clearWaterCache()
    })

    it('caches listWaterEntries results within TTL to avoid duplicate database calls', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockListDocuments.mockResolvedValue({
        documents: [{ $id: 'water-1', owner: 'user-123', amount_ml: 250, consumed_at: '2026-07-09T10:00:00.000Z' }],
      })

      const targetDate = new Date(2026, 6, 9)
      const res1 = await waterModule.listWaterEntries('user-123', targetDate)
      expect(res1).toHaveLength(1)
      expect(mockListDocuments).toHaveBeenCalledTimes(1)

      // Second call immediately after should hit in-memory cache
      const res2 = await waterModule.listWaterEntries('user-123', targetDate)
      expect(res2).toHaveLength(1)
      expect(mockListDocuments).toHaveBeenCalledTimes(1) // Still 1!
    })

    it('deduplicates concurrent listWaterEntries calls returning identical promise instance', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockListDocuments.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  documents: [{ $id: 'water-1', owner: 'user-123', amount_ml: 250, consumed_at: '2026-07-09T10:00:00.000Z' }],
                }),
              10,
            ),
          ),
      )

      const targetDate = new Date(2026, 6, 9)
      const p1 = waterModule.listWaterEntries('user-123', targetDate)
      const p2 = waterModule.listWaterEntries('user-123', targetDate)

      expect(p1).toBe(p2) // Strict reference equality for inflight promise

      const [res1, res2] = await Promise.all([p1, p2])
      expect(res1).toEqual(res2)
      expect(mockListDocuments).toHaveBeenCalledTimes(1)
    })

    it('clears water cache when addWaterEntry is called', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockListDocuments.mockResolvedValue({
        documents: [{ $id: 'water-1', owner: 'user-123', amount_ml: 250, consumed_at: '2026-07-09T10:00:00.000Z' }],
      })
      mockCreateDocument.mockResolvedValue({
        $id: 'water-2',
        owner: 'user-123',
        amount_ml: 500,
        consumed_at: '2026-07-09T11:00:00.000Z',
      })

      const targetDate = new Date(2026, 6, 9)
      await waterModule.listWaterEntries('user-123', targetDate)
      expect(mockListDocuments).toHaveBeenCalledTimes(1)

      // Add new water entry
      await waterModule.addWaterEntry('user-123', 500, targetDate)

      // Subsequent listWaterEntries call should query database again
      await waterModule.listWaterEntries('user-123', targetDate)
      expect(mockListDocuments).toHaveBeenCalledTimes(2)
    })

    it('clears water cache when deleteWaterEntry is called', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockListDocuments.mockResolvedValue({
        documents: [{ $id: 'water-1', owner: 'user-123', amount_ml: 250, consumed_at: '2026-07-09T10:00:00.000Z' }],
      })
      mockGetDocument.mockResolvedValue({
        $id: 'water-1',
        owner: 'user-123',
        amount_ml: 250,
      })
      mockDeleteDocument.mockResolvedValue({})

      const targetDate = new Date(2026, 6, 9)
      await waterModule.listWaterEntries('user-123', targetDate)
      expect(mockListDocuments).toHaveBeenCalledTimes(1)

      // Delete water entry
      await waterModule.deleteWaterEntry('user-123', 'water-1')

      // Subsequent listWaterEntries call should query database again
      await waterModule.listWaterEntries('user-123', targetDate)
      expect(mockListDocuments).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteWaterEntry BOLA / IDOR protection', () => {
    it('throws error if current authenticated user does not match requested userId', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        waterModule.deleteWaterEntry('user-456', 'water-doc-1')
      ).rejects.toThrow('You can only change your own water log.')

      expect(mockGetDocument).not.toHaveBeenCalled()
      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('throws error if water entry owner does not match current user', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'water-doc-1',
        owner: 'user-456', // Different owner!
        amount_ml: 250,
      })

      await expect(
        waterModule.deleteWaterEntry('user-123', 'water-doc-1')
      ).rejects.toThrow('Unauthorized: You can only delete your own water logs.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('successfully deletes water entry when user is the owner', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'water-doc-1',
        owner: 'user-123',
        amount_ml: 250,
      })
      mockDeleteDocument.mockResolvedValue({})

      await waterModule.deleteWaterEntry('user-123', 'water-doc-1')

      expect(mockGetDocument).toHaveBeenCalledTimes(1)
      expect(mockDeleteDocument).toHaveBeenCalledWith({
        databaseId: 'test-db',
        collectionId: 'test-water-col',
        documentId: 'water-doc-1',
      })
    })
  })
})
