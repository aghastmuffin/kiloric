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

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {},
    ID: { unique: () => 'id-1' },
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

const { getWorkout } = await import('./workouts')
const { resetRecordStoreSession } = await import('./recordStore')

beforeEach(() => {
  vi.clearAllMocks()
  resetRecordStoreSession()
  mocks.get.mockResolvedValue({ $id: 'u1' })
})

describe('getWorkout input validation', () => {
  it('returns null immediately for malformed workout IDs', async () => {
    expect(await getWorkout('u1', 'invalid id!')).toBeNull()
    expect(await getWorkout('u1', '../path/traversal')).toBeNull()
    expect(await getWorkout('u1', '')).toBeNull()
    expect(mocks.listDocuments).not.toHaveBeenCalled()
  })

  it('queries database for valid workout IDs', async () => {
    const mockWorkout = { $id: 'w123', name: 'Leg Day', owner: 'u1' }
    mocks.listDocuments.mockResolvedValue({ documents: [mockWorkout] })

    const result = await getWorkout('u1', 'w123')
    expect(result).toEqual(mockWorkout)
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
  })
})
