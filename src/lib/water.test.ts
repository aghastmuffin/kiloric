// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import { localDayBounds, totalWaterMl } from './waterUtils'

// Create hoisted mock functions
const {
  mockDeleteDocument,
  mockGetDocument,
  mockGetAccount,
} = vi.hoisted(() => {
  return {
    mockDeleteDocument: vi.fn(),
    mockGetDocument: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

// Mock transitive dependencies
vi.mock('./appwrite', () => {
  return {
    databases: {
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
      orderDesc: (key: string) => `orderDesc:${key}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

// Set up environment variables
process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID = 'test-water-col'

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

describe('deleteWaterEntry with BOLA/IDOR protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully deletes water entry when current user is the owner', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockGetDocument.mockResolvedValue({
      $id: 'water-doc-1',
      owner: 'user-123',
      amount_ml: 250,
      consumed_at: '2026-06-09T15:30:00.000Z',
    })
    mockDeleteDocument.mockResolvedValue({})

    await expect(
      waterModule.deleteWaterEntry('user-123', 'water-doc-1')
    ).resolves.not.toThrow()

    expect(mockGetDocument).toHaveBeenCalledTimes(1)
    expect(mockDeleteDocument).toHaveBeenCalledTimes(1)
  })

  it('throws an error if the current user is not the owner (BOLA/IDOR prevention)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockGetDocument.mockResolvedValue({
      $id: 'water-doc-2',
      owner: 'user-456', // different owner!
      amount_ml: 250,
      consumed_at: '2026-06-09T15:30:00.000Z',
    })

    await expect(
      waterModule.deleteWaterEntry('user-123', 'water-doc-2')
    ).rejects.toThrow('Unauthorized: You can only delete your own water logs.')

    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('throws an error if user parameter does not match active session user (authenticated user assertion)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })

    await expect(
      waterModule.deleteWaterEntry('user-456', 'water-doc-2')
    ).rejects.toThrow('You can only change your own water log.')

    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('throws an error if water entry is not found', async () => {
    const reactNativeAppwrite = await import('react-native-appwrite')
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockGetDocument.mockRejectedValue(
      new reactNativeAppwrite.AppwriteException('Document not found', 404, 'document_not_found')
    )

    await expect(
      waterModule.deleteWaterEntry('user-123', 'water-doc-missing')
    ).rejects.toThrow('Water entry not found.')

    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })
})
