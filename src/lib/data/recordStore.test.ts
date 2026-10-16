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
  class AppwriteException extends Error {
    code: number
    type: string
    constructor(message: string, code: number, type: string) {
      super(message)
      this.code = code
      this.type = type
    }
  }
  let counter = 0
  return {
    AppwriteException,
    ID: { unique: () => `id-${(counter += 1)}` },
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

const { AppwriteException } = await import('react-native-appwrite')
const { applyListOptions, createRecordStore, matchesFilters, resetRecordStoreSession } = await import('./recordStore')

type Row = { day: string; kcal: number; done: boolean }

let prefs: Record<string, unknown>

beforeEach(() => {
  vi.clearAllMocks()
  resetRecordStoreSession()
  prefs = {}
  mocks.get.mockResolvedValue({ $id: 'u1' })
  mocks.getPrefs.mockImplementation(async () => structuredClone(prefs))
  mocks.updatePrefs.mockImplementation(async ({ prefs: next }: { prefs: Record<string, unknown> }) => {
    prefs = structuredClone(next)
    return next
  })
})

const missing = () => new (AppwriteException as unknown as new (m: string, c: number, t: string) => Error)('missing', 404, 'collection_not_found')

describe('filters and ordering', () => {
  it('matches eq / range filters', () => {
    const row = { day: '2026-10-16', kcal: 300, done: true }
    expect(matchesFilters(row, [{ field: 'day', op: 'gte', value: '2026-10-10' }, { field: 'done', op: 'eq', value: true }])).toBe(true)
    expect(matchesFilters(row, [{ field: 'day', op: 'lt', value: '2026-10-16' }])).toBe(false)
    expect(matchesFilters(row, [{ field: 'kcal', op: 'lte', value: 300 }])).toBe(true)
  })

  it('sorts and limits', () => {
    const rows = [{ kcal: 2 }, { kcal: 3 }, { kcal: 1 }]
    expect(applyListOptions(rows, { orderBy: 'kcal', desc: true, limit: 2 })).toEqual([{ kcal: 3 }, { kcal: 2 }])
  })
})

describe('createRecordStore', () => {
  it('uses the table with owner-only permissions when it exists', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows_a', databaseId: 'db', fallbackLimit: 5, recencyField: 'day' })
    mocks.createDocument.mockImplementation(async ({ data }: { data: Row }) => ({ $id: 'doc1', ...data }))
    await store.create('u1', { day: '2026-10-16', kcal: 100, done: false })
    expect(mocks.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'rows_a',
        data: { day: '2026-10-16', kcal: 100, done: false, owner: 'u1' },
        permissions: ['read(user:u1)', 'update(user:u1)', 'delete(user:u1)'],
      }),
    )
    expect(store.mode()).toBe('table')
  })

  it('falls back to account prefs when the table is not provisioned', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows_b', databaseId: 'db', fallbackLimit: 2, recencyField: 'day' })
    mocks.createDocument.mockRejectedValue(missing())
    mocks.listDocuments.mockRejectedValue(missing())

    await store.create('u1', { day: '2026-10-14', kcal: 100, done: false })
    await store.create('u1', { day: '2026-10-15', kcal: 200, done: false })
    const third = await store.create('u1', { day: '2026-10-16', kcal: 300, done: false })
    expect(store.mode()).toBe('prefs')
    expect((prefs.cc_rows_b as Row[]).map((row) => row.day)).toEqual(['2026-10-16', '2026-10-15'])

    await store.update('u1', third.$id, { done: true })
    const rows = await store.list('u1', [{ field: 'done', op: 'eq', value: true }])
    expect(rows.map((row) => row.kcal)).toEqual([300])

    await store.remove('u1', third.$id)
    expect(await store.list('u1')).toHaveLength(1)
  })

  it('refuses to act for another signed-in user', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows_c', databaseId: 'db', fallbackLimit: 5, recencyField: 'day' })
    await expect(store.list('someone-else')).rejects.toThrow(/Unauthorized/)
    expect(mocks.listDocuments).not.toHaveBeenCalled()
  })

  it('migrates parked prefs records into the table once it exists', async () => {
    prefs = { cc_rows_d: [{ $id: 'p1', $createdAt: 'x', $updatedAt: 'x', owner: 'u1', day: '2026-10-16', kcal: 50, done: false }] }
    const store = createRecordStore<Row>({ collectionId: 'rows_d', databaseId: 'db', fallbackLimit: 5, recencyField: 'day' })
    mocks.listDocuments.mockResolvedValue({ documents: [] })
    mocks.createDocument.mockResolvedValue({ $id: 'doc' })
    await store.list('u1')
    await vi.waitFor(() => expect(prefs.cc_rows_d).toBeUndefined())
    expect(mocks.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ collectionId: 'rows_d', data: { owner: 'u1', day: '2026-10-16', kcal: 50, done: false } }),
    )
  })
})
