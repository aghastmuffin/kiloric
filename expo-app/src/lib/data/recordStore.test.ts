import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    get: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

vi.mock('@/lib/serverData', () => ({
  account: { get: mocks.get },
  databases: {
    listDocuments: mocks.listDocuments,
    createDocument: mocks.createDocument,
    getDocument: mocks.getDocument,
    updateDocument: mocks.updateDocument,
    deleteDocument: mocks.deleteDocument,
  },
}))

import { applyListOptions, createRecordStore, matchesFilters, resetRecordStoreSession } from './recordStore'

type Row = { day: string; kcal: number; done: boolean }

beforeEach(() => {
  vi.clearAllMocks()
  resetRecordStoreSession()
  mocks.get.mockResolvedValue({ $id: 'u1' })
})

describe('filter helpers', () => {
  it('matches ranges and sorts results', () => {
    const row = { day: '2026-10-16', kcal: 300, done: true }
    expect(matchesFilters(row, [{ field: 'day', op: 'gte', value: '2026-10-10' }, { field: 'done', op: 'eq', value: true }])).toBe(true)
    expect(applyListOptions([{ kcal: 2 }, { kcal: 3 }, { kcal: 1 }], { orderBy: 'kcal', desc: true, limit: 2 }))
      .toEqual([{ kcal: 3 }, { kcal: 2 }])
  })
})

describe('server record store', () => {
  it('creates records without trusting a client owner field', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows' })
    mocks.createDocument.mockResolvedValue({ $id: 'row-1', owner: 'u1' })
    await store.create('u1', { day: '2026-10-16', kcal: 100, done: false })
    expect(mocks.createDocument).toHaveBeenCalledWith({
      collectionId: 'rows',
      data: { day: '2026-10-16', kcal: 100, done: false },
    })
    expect(store.mode()).toBe('server')
  })

  it('refuses to access another signed-in user', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows' })
    await expect(store.list('someone-else')).rejects.toThrow(/Unauthorized/)
    expect(mocks.listDocuments).not.toHaveBeenCalled()
  })

  it('checks ownership before update and delete', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows' })
    mocks.getDocument.mockResolvedValue({ $id: 'row-1', owner: 'u1' })
    mocks.updateDocument.mockResolvedValue({ $id: 'row-1', owner: 'u1', done: true })
    await store.update('u1', 'row-1', { done: true })
    await store.remove('u1', 'row-1')
    expect(mocks.updateDocument).toHaveBeenCalledOnce()
    expect(mocks.deleteDocument).toHaveBeenCalledOnce()
  })

  it('rejects malformed record IDs', async () => {
    const store = createRecordStore<Row>({ collectionId: 'rows' })
    await expect(store.update('u1', 'invalid/id!', { done: true })).rejects.toThrow('Invalid record ID.')
    await expect(store.remove('u1', '')).rejects.toThrow('Invalid record ID.')
  })
})
