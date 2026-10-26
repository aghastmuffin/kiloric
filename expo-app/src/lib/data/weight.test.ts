// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    get: vi.fn(),
    getPrefs: vi.fn(),
    updatePrefs: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

vi.mock('@/lib/appwrite', () => ({
  account: { get: mocks.get, getPrefs: mocks.getPrefs, updatePrefs: mocks.updatePrefs },
  databases: {
    listDocuments: mocks.listDocuments,
    createDocument: mocks.createDocument,
    getDocument: mocks.getDocument,
    updateDocument: mocks.updateDocument,
    deleteDocument: mocks.deleteDocument,
  },
}))

vi.mock('@/lib/profile', () => ({
  updateProfile: mocks.updateProfile,
}))

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {},
    ID: { unique: () => 'id-weight-1' },
    Permission: { read: (r: string) => `read(${r})`, update: (r: string) => `update(${r})`, delete: (r: string) => `delete(${r})` },
    Role: { user: (id: string) => `user:${id}` },
    Query: {
      equal: (field: string, value: unknown) => `equal:${field}:${value}`,
      greaterThanEqual: (field: string, value: unknown) => `gte:${field}:${value}`,
      lessThan: (field: string, value: unknown) => `lt:${field}:${value}`,
      lessThanEqual: (field: string, value: unknown) => `lte:${field}:${value}`,
      orderAsc: (field: string) => `asc:${field}`,
      orderDesc: (field: string) => `desc:${field}`,
      limit: (value: number) => `limit:${value}`,
    },
  }
})

const { dailyWeightSeries, listWeightsSince, logWeight, weightDelta } = await import('./weight')
const { resetRecordStoreSession } = await import('./recordStore')

beforeEach(() => {
  vi.clearAllMocks()
  resetRecordStoreSession()
  mocks.get.mockResolvedValue({ $id: 'u1' })
  mocks.listDocuments.mockResolvedValue({ documents: [] })
})

describe('logWeight validation', () => {
  it('throws error for weights outside 20-400 kg', async () => {
    await expect(logWeight('u1', 15)).rejects.toThrow('Enter a weight between 20 and 400 kg')
    await expect(logWeight('u1', 450)).rejects.toThrow('Enter a weight between 20 and 400 kg')
  })

  it('creates entry and updates profile weight when it is the latest weigh-in', async () => {
    const now = new Date('2025-02-23T10:00:00Z')
    mocks.createDocument.mockResolvedValue({
      $id: 'w1',
      $createdAt: now.toISOString(),
      $updatedAt: now.toISOString(),
      owner: 'u1',
      weight_kg: 75.5,
      day: '2025-02-23',
      logged_at: now.toISOString(),
    })
    mocks.listDocuments.mockResolvedValue({ documents: [] })

    const entry = await logWeight('u1', 75.54, now)
    expect(entry.weight_kg).toBe(75.5)
    expect(mocks.updateProfile).toHaveBeenCalledWith('u1', { weight: 75.5 })
  })

  it('creates back-dated entry without updating profile weight if a newer entry exists', async () => {
    const yesterday = new Date('2025-02-22T10:00:00Z')
    const today = new Date('2025-02-23T10:00:00Z')

    mocks.createDocument.mockResolvedValue({
      $id: 'w-old',
      $createdAt: yesterday.toISOString(),
      $updatedAt: yesterday.toISOString(),
      owner: 'u1',
      weight_kg: 76.0,
      day: '2025-02-22',
      logged_at: yesterday.toISOString(),
    })

    // Simulate existing newer entry
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: 'w-today',
          weight_kg: 75.0,
          day: '2025-02-23',
          logged_at: today.toISOString(),
        },
      ],
    })

    await logWeight('u1', 76.0, yesterday)
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })
})

describe('dailyWeightSeries', () => {
  it('sorts weights by day and picks latest logged_at per day', () => {
    const logs = [
      { weight_kg: 75.0, day: '2025-02-22', logged_at: '2025-02-22T08:00:00Z' },
      { weight_kg: 74.8, day: '2025-02-22', logged_at: '2025-02-22T20:00:00Z' },
      { weight_kg: 76.0, day: '2025-02-20', logged_at: '2025-02-20T08:00:00Z' },
    ]

    const series = dailyWeightSeries(logs)
    expect(series).toEqual([
      { day: '2025-02-20', weightKg: 76.0 },
      { day: '2025-02-22', weightKg: 74.8 },
    ])
  })
})

describe('weightDelta', () => {
  it('returns null for fewer than 2 points', () => {
    expect(weightDelta([])).toBeNull()
    expect(weightDelta([{ day: '2025-02-20', weightKg: 75.0 }])).toBeNull()
  })

  it('calculates rounded weight difference from start to end', () => {
    const series = [
      { day: '2025-02-20', weightKg: 76.2 },
      { day: '2025-02-22', weightKg: 74.8 },
    ]
    expect(weightDelta(series)).toBe(-1.4)
  })
})

describe('listWeightsSince', () => {
  it('queries database with gte logged_at filter', async () => {
    const since = new Date('2025-02-01T00:00:00Z')
    await listWeightsSince('u1', since)
    expect(mocks.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'weight_logs',
        queries: expect.arrayContaining(['equal:owner:u1', `gte:logged_at:${since.toISOString()}`]),
      }),
    )
  })
})
