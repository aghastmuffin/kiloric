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
    waterModule.clearWaterCache()
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

  describe('listWaterEntries cache', () => {
    it('caches successful reads and deduplicates concurrent requests', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      let resolveRead!: (value: { documents: unknown[] }) => void
      mockListDocuments.mockReturnValueOnce(new Promise((resolve) => {
        resolveRead = resolve
      }))

      const date = new Date(2026, 6, 9)
      const first = waterModule.listWaterEntries('user-123', date)
      const second = waterModule.listWaterEntries('user-123', date)
      expect(first).toBe(second)

      const entries = [{ $id: 'water-1', owner: 'user-123', amount_ml: 250 }]
      resolveRead({ documents: entries })
      await expect(first).resolves.toEqual(entries)
      await expect(waterModule.listWaterEntries('user-123', date)).resolves.toEqual(entries)
      expect(mockListDocuments).toHaveBeenCalledTimes(1)
    })

    it('isolates calendar days and expires entries after 15 seconds', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockListDocuments.mockResolvedValue({ documents: [] })
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)

      try {
        await waterModule.listWaterEntries('user-123', new Date(2026, 6, 9))
        await waterModule.listWaterEntries('user-123', new Date(2026, 6, 10))
        expect(mockListDocuments).toHaveBeenCalledTimes(2)

        now.mockReturnValue(16_001)
        await waterModule.listWaterEntries('user-123', new Date(2026, 6, 9))
        expect(mockListDocuments).toHaveBeenCalledTimes(3)
      } finally {
        now.mockRestore()
      }
    })

    it('invalidates cached reads after successful mutations', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockListDocuments.mockResolvedValue({ documents: [] })
      mockCreateDocument.mockResolvedValue({ $id: 'water-2', owner: 'user-123', amount_ml: 500 })
      const date = new Date(2026, 6, 9)

      await waterModule.listWaterEntries('user-123', date)
      await waterModule.addWaterEntry('user-123', 500, date)
      await waterModule.listWaterEntries('user-123', date)

      expect(mockListDocuments).toHaveBeenCalledTimes(2)
    })

    it('does not let a cleared in-flight request repopulate the cache', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      let resolveStale!: (value: { documents: unknown[] }) => void
      const staleRead = new Promise<{ documents: unknown[] }>((resolve) => {
        resolveStale = resolve
      })
      const freshEntries = [{ $id: 'water-fresh', owner: 'user-123', amount_ml: 500 }]
      mockListDocuments
        .mockReturnValueOnce(staleRead)
        .mockResolvedValueOnce({ documents: freshEntries })
      const date = new Date(2026, 6, 9)

      const staleRequest = waterModule.listWaterEntries('user-123', date)
      waterModule.clearWaterCache()
      const freshRequest = waterModule.listWaterEntries('user-123', date)
      resolveStale({ documents: [{ $id: 'water-stale', owner: 'user-123', amount_ml: 250 }] })

      await staleRequest
      await expect(freshRequest).resolves.toEqual(freshEntries)
      await expect(waterModule.listWaterEntries('user-123', date)).resolves.toEqual(freshEntries)
      expect(mockListDocuments).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteWaterEntry BOLA / IDOR protection', () => {
    it('throws error when provided an invalid documentId format', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        waterModule.deleteWaterEntry('user-123', 'invalid/doc/id!')
      ).rejects.toThrow('Invalid water entry.')

      expect(mockGetDocument).not.toHaveBeenCalled()
      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

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
      mockListDocuments
        .mockResolvedValueOnce({ documents: [{ $id: 'water-doc-1', owner: 'user-123', amount_ml: 250 }] })
        .mockResolvedValueOnce({ documents: [] })
      mockGetDocument.mockResolvedValue({
        $id: 'water-doc-1',
        owner: 'user-123',
        amount_ml: 250,
      })
      mockDeleteDocument.mockResolvedValue({})

      const date = new Date(2026, 6, 9)
      await waterModule.listWaterEntries('user-123', date)
      await waterModule.deleteWaterEntry('user-123', 'water-doc-1')
      await waterModule.listWaterEntries('user-123', date)

      expect(mockGetDocument).toHaveBeenCalledTimes(1)
      expect(mockDeleteDocument).toHaveBeenCalledWith({
        databaseId: 'test-db',
        collectionId: 'test-water-col',
        documentId: 'water-doc-1',
      })
      expect(mockListDocuments).toHaveBeenCalledTimes(2)
    })
  })
})
