import { withTimeout } from '@/lib/asyncUtils'
import { databases } from '@/lib/serverData'
import { getSessionUserId } from '@/lib/sessionAuth'
import { Query, type Models } from '@/lib/serverTypes'

/** Owner-scoped persistence backed exclusively by the Kiloric API. */
export type StoredRecord<T> = T & {
  $id: string
  $createdAt: string
  $updatedAt: string
  owner: string
}

export type Filter =
  | { field: string; op: 'eq'; value: string | number | boolean }
  | { field: string; op: 'gte' | 'lt' | 'lte'; value: string | number }

export type ListOptions = {
  orderBy?: string
  desc?: boolean
  limit?: number
}

type StoreConfig = {
  collectionId: string
  databaseId?: string
  fallbackLimit?: number
  recencyField?: string
}

let sessionCheck: { userId: string; expiresAt: number } | null = null

export async function assertSessionUser(userId: string): Promise<string> {
  if (sessionCheck && sessionCheck.userId === userId && sessionCheck.expiresAt > Date.now()) return userId
  const sessionUserId = await withTimeout(getSessionUserId(), 10000, 'Session verification timed out.')
  if (sessionUserId !== userId) {
    sessionCheck = null
    throw new Error('Unauthorized: you can only access your own records.')
  }
  sessionCheck = { userId, expiresAt: Date.now() + 30_000 }
  return userId
}

export function resetRecordStoreSession(): void {
  sessionCheck = null
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

export function matchesFilters(record: Record<string, unknown>, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = record[filter.field]
    switch (filter.op) {
      case 'eq': return value === filter.value
      case 'gte': return value != null && compare(value, filter.value) >= 0
      case 'lt': return value != null && compare(value, filter.value) < 0
      case 'lte': return value != null && compare(value, filter.value) <= 0
    }
  })
}

export function applyListOptions<T extends Record<string, unknown>>(records: T[], options: ListOptions): T[] {
  const sorted = options.orderBy
    ? [...records].sort((a, b) => {
        const result = compare(a[options.orderBy!], b[options.orderBy!])
        return options.desc ? -result : result
      })
    : records
  return options.limit == null ? sorted : sorted.slice(0, options.limit)
}

function toQueries(filters: Filter[], options: ListOptions): string[] {
  const queries = filters.map((filter) => {
    switch (filter.op) {
      case 'eq': return Query.equal(filter.field, filter.value)
      case 'gte': return Query.greaterThanEqual(filter.field, filter.value)
      case 'lt': return Query.lessThan(filter.field, filter.value)
      case 'lte': return Query.lessThanEqual(filter.field, filter.value)
    }
  })
  if (options.orderBy) queries.push(options.desc ? Query.orderDesc(options.orderBy) : Query.orderAsc(options.orderBy))
  queries.push(Query.limit(Math.min(options.limit ?? 500, 5000)))
  return queries
}

function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => value !== undefined && !key.startsWith('$') && key !== 'owner'),
  )
}

export type RecordStore<T extends Record<string, unknown>> = {
  collectionId: string
  mode: () => 'server'
  list: (userId: string, filters?: Filter[], options?: ListOptions) => Promise<StoredRecord<T>[]>
  create: (userId: string, data: T) => Promise<StoredRecord<T>>
  update: (userId: string, id: string, patch: Partial<T>) => Promise<StoredRecord<T>>
  remove: (userId: string, id: string) => Promise<void>
}

export function createRecordStore<T extends Record<string, unknown>>(config: StoreConfig): RecordStore<T> {
  const { collectionId } = config
  return {
    collectionId,
    mode: () => 'server',
    async list(userId, filters = [], options = {}) {
      await assertSessionUser(userId)
      const response = await withTimeout(
        databases.listDocuments<Models.Document>({ collectionId, queries: toQueries(filters, options) }),
        10000,
        'Database request timed out.',
      )
      return response.documents as unknown as StoredRecord<T>[]
    },
    async create(userId, data) {
      await assertSessionUser(userId)
      return await withTimeout(
        databases.createDocument({ collectionId, data: cleanPayload(data) }),
        10000,
        'Database request timed out.',
      ) as StoredRecord<T>
    },
    async update(userId, id, patch) {
      await assertSessionUser(userId)
      if (!/^[a-zA-Z0-9._-]{1,64}$/.test(id)) throw new Error('Invalid record ID.')
      const existing = await databases.getDocument({ collectionId, documentId: id })
      if (existing.owner !== userId) throw new Error('Unauthorized: you can only change your own records.')
      return await withTimeout(
        databases.updateDocument({ collectionId, documentId: id, data: cleanPayload(patch as Record<string, unknown>) }),
        10000,
        'Database request timed out.',
      ) as StoredRecord<T>
    },
    async remove(userId, id) {
      await assertSessionUser(userId)
      if (!/^[a-zA-Z0-9._-]{1,64}$/.test(id)) throw new Error('Invalid record ID.')
      const existing = await databases.getDocument({ collectionId, documentId: id })
      if (existing.owner !== userId) throw new Error('Unauthorized: you can only delete your own records.')
      await withTimeout(
        databases.deleteDocument({ collectionId, documentId: id }),
        10000,
        'Database request timed out.',
      )
    },
  }
}

export function describeStoreModes(stores: RecordStore<Record<string, unknown>>[]) {
  return stores.map((store) => ({ collectionId: store.collectionId, mode: 'server' as const }))
}
