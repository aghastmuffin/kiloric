// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import { localDayBounds, totalWaterMl } from './waterUtils'

const {
  mockGetAccount,
  mockGetDocument,
  mockDeleteDocument,
} = vi.hoisted(() => {
  return {
    mockGetAccount: vi.fn(),
    mockGetDocument: vi.fn(),
    mockDeleteDocument: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: {
      getDocument: mockGetDocument,
      deleteDocument: mockDeleteDocument,
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
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
      constructor(message: string, code: number) {
        super(message)
        this.code = code
      }
    },
    ID: { unique: () => 'mock-id' },
    Permission: { read: () => '', update: () => '', delete: () => '' },
    Role: { user: (id: string) => `user:${id}` },
    Query: {
      equal: () => '',
      greaterThanEqual: () => '',
      lessThan: () => '',
      orderDesc: () => '',
      limit: () => '',
    },
  }
})

process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID = 'water_logs'

let waterModule: typeof import('./water')

beforeAll(async () => {
  waterModule = await import('./water')
})

describe('waterUtils', () => {
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

describe('deleteWaterEntry BOLA / IDOR protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws error when requested userId does not match session user', async () => {
    mockGetAccount.mockResolvedValueOnce({ $id: 'user-123' })

    await expect(
      waterModule.deleteWaterEntry('user-456', 'water-doc-1'),
    ).rejects.toThrow('You can only change your own water log.')

    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('throws error when water entry belongs to a different owner', async () => {
    mockGetAccount.mockResolvedValueOnce({ $id: 'user-123' })
    mockGetDocument.mockResolvedValueOnce({
      $id: 'water-doc-1',
      owner: 'user-456', // Different owner!
      amount_ml: 250,
    })

    await expect(
      waterModule.deleteWaterEntry('user-123', 'water-doc-1'),
    ).rejects.toThrow('Unauthorized: You can only delete your own water logs.')

    expect(mockGetDocument).toHaveBeenCalledTimes(1)
    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('successfully deletes water entry when owner matches session user', async () => {
    mockGetAccount.mockResolvedValueOnce({ $id: 'user-123' })
    mockGetDocument.mockResolvedValueOnce({
      $id: 'water-doc-1',
      owner: 'user-123', // Matching owner
      amount_ml: 250,
    })
    mockDeleteDocument.mockResolvedValueOnce({})

    await waterModule.deleteWaterEntry('user-123', 'water-doc-1')

    expect(mockGetDocument).toHaveBeenCalledWith({
      databaseId: 'test-db',
      collectionId: 'water_logs',
      documentId: 'water-doc-1',
    })
    expect(mockDeleteDocument).toHaveBeenCalledWith({
      databaseId: 'test-db',
      collectionId: 'water_logs',
      documentId: 'water-doc-1',
    })
  })
})
