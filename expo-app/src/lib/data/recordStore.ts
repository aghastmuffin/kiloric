import { account, databases } from '@/lib/appwrite'
import { AppwriteException, ID, Permission, Query, Role, type Models } from 'react-native-appwrite'

/**
 * Owner-scoped persistence for kiloric feature tables.
 *
 * Each store targets an Appwrite table (see `appwrite.config.json`). When the
 * table has not been provisioned yet, Appwrite answers `collection_not_found`;
 * the store then keeps that user's records in their Appwrite account prefs under
 * `cc_<collectionId>` so the feature still syncs across devices. Once the table
 * exists, any records parked in prefs are copied into it and the prefs key is
 * cleared.
 */

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

export type StoreMode = 'table' | 'prefs'

type StoreConfig = {
  collectionId: string
  databaseId?: string
  /** Max records kept per user while running from account prefs. */
  fallbackLimit: number
  /** Field used to keep the newest records when trimming prefs. */
  recencyField: string
}

const PREFS_BUDGET_CHARS = 60_000
const PREFS_CACHE_MS = 4_000
const SESSION_CACHE_MS = 30_000

const DEFAULT_DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? ''

let sessionCheck: { userId: string; expiresAt: number } | null = null

export async function assertSessionUser(userId: string): Promise<string> {
  if (sessionCheck && sessionCheck.userId === userId && sessionCheck.expiresAt > Date.now()) {
    return userId
  }
  const me = await account.get()
  if (me.$id !== userId) {
    sessionCheck = null
    throw new Error('Unauthorized: you can only access your own records.')
  }
  sessionCheck = { userId, expiresAt: Date.now() + SESSION_CACHE_MS }
  return userId
}

export function resetRecordStoreSession(): void {
  sessionCheck = null
  prefsCache = null
  for (const key of Object.keys(modeByCollection)) delete modeByCollection[key]
}

type PrefsShape = Record<string, unknown>

let prefsCache: { value: Promise<PrefsShape>; expiresAt: number } | null = null
let prefsWriteChain: Promise<unknown> = Promise.resolve()

function readPrefs(): Promise<PrefsShape> {
  if (prefsCache && prefsCache.expiresAt > Date.now()) return prefsCache.value
  const value = account.getPrefs<PrefsShape>().then((prefs) => ({ ...(prefs ?? {}) }))
  prefsCache = { value, expiresAt: Date.now() + PREFS_CACHE_MS }
  value.catch(() => {
    prefsCache = null
  })
  return value
}

function trimToBudget(prefs: PrefsShape): PrefsShape {
  let serialized = JSON.stringify(prefs)
  while (serialized.length > PREFS_BUDGET_CHARS) {
    let largestKey: string | null = null
    let largestLength = 0
    for (const [key, value] of Object.entries(prefs)) {
      if (!key.startsWith('cc_') || !Array.isArray(value) || value.length === 0) continue
      const length = JSON.stringify(value).length
      if (length > largestLength) {
        largestKey = key
        largestLength = length
      }
    }
    if (!largestKey) break
    const records = prefs[largestKey] as unknown[]
    prefs[largestKey] = records.slice(0, Math.max(0, records.length - Math.ceil(records.length / 10)))
    serialized = JSON.stringify(prefs)
  }
  return prefs
}

/** Serialized read-modify-write so concurrent saves never clobber each other. */
function mutatePrefs(mutator: (prefs: PrefsShape) => void): Promise<PrefsShape> {
  const run = prefsWriteChain.then(async () => {
    prefsCache = null
    const current = await account.getPrefs<PrefsShape>()
    const next: PrefsShape = { ...(current ?? {}) }
    mutator(next)
    const trimmed = trimToBudget(next)
    await account.updatePrefs({ prefs: trimmed })
    prefsCache = { value: Promise.resolve(trimmed), expiresAt: Date.now() + PREFS_CACHE_MS }
    return trimmed
  })
  prefsWriteChain = run.catch(() => undefined)
  return run
}

const modeByCollection: Record<string, StoreMode> = {}

export function isMissingTableError(err: unknown): boolean {
  if (!(err instanceof AppwriteException)) return false
  return (
    err.code === 404 &&
    (err.type === 'collection_not_found' || err.type === 'database_not_found' || err.type === 'table_not_found')
  )
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

export function matchesFilters(record: Record<string, unknown>, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = record[filter.field]
    switch (filter.op) {
      case 'eq':
        return value === filter.value
      case 'gte':
        return value != null && compare(value, filter.value) >= 0
      case 'lt':
        return value != null && compare(value, filter.value) < 0
      case 'lte':
        return value != null && compare(value, filter.value) <= 0
      default:
        return false
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
  return options.limit != null ? sorted.slice(0, options.limit) : sorted
}

function toQueries(filters: Filter[], options: ListOptions): string[] {
  const queries = filters.map((filter) => {
    switch (filter.op) {
      case 'eq':
        return Query.equal(filter.field, filter.value)
      case 'gte':
        return Query.greaterThanEqual(filter.field, filter.value)
      case 'lt':
        return Query.lessThan(filter.field, filter.value)
      case 'lte':
        return Query.lessThanEqual(filter.field, filter.value)
    }
  })
  if (options.orderBy) {
    queries.push(options.desc ? Query.orderDesc(options.orderBy) : Query.orderAsc(options.orderBy))
  }
  queries.push(Query.limit(Math.min(options.limit ?? 500, 5000)))
  return queries
}

function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith('$')) continue
    data[key] = value
  }
  return data
}

function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || key.startsWith('$')) continue
    cleaned[key] = value
  }
  return cleaned
}

export type RecordStore<T extends Record<string, unknown>> = {
  collectionId: string
  mode: () => StoreMode | undefined
  list: (userId: string, filters?: Filter[], options?: ListOptions) => Promise<StoredRecord<T>[]>
  create: (userId: string, data: T) => Promise<StoredRecord<T>>
  update: (userId: string, id: string, patch: Partial<T>) => Promise<StoredRecord<T>>
  remove: (userId: string, id: string) => Promise<void>
}

export function createRecordStore<T extends Record<string, unknown>>(config: StoreConfig): RecordStore<T> {
  const databaseId = config.databaseId ?? DEFAULT_DATABASE_ID
  const { collectionId } = config
  const prefsKey = `cc_${collectionId}`
  const migratedUsers = new Set<string>()

  async function prefsRecords(userId: string): Promise<StoredRecord<T>[]> {
    const prefs = await readPrefs()
    const raw = prefs[prefsKey]
    if (!Array.isArray(raw)) return []
    return (raw as StoredRecord<T>[]).filter((record) => record && record.owner === userId)
  }

  async function migrateFromPrefs(userId: string): Promise<void> {
    if (migratedUsers.has(userId)) return
    migratedUsers.add(userId)
    const parked = await prefsRecords(userId).catch(() => [])
    if (parked.length === 0) return
    for (const record of parked) {
      await databases.createDocument({
        databaseId,
        collectionId,
        documentId: ID.unique(),
        data: cleanPayload(stripSystemFields(record as Record<string, unknown>)),
        permissions: ownerPermissions(userId),
      })
    }
    await mutatePrefs((prefs) => {
      delete prefs[prefsKey]
    })
  }

  async function withTable<R>(table: () => Promise<R>, fallback: () => Promise<R>): Promise<R> {
    if (modeByCollection[collectionId] === 'prefs') return fallback()
    try {
      const result = await table()
      modeByCollection[collectionId] = 'table'
      return result
    } catch (err) {
      if (!isMissingTableError(err)) throw err
      modeByCollection[collectionId] = 'prefs'
      return fallback()
    }
  }

  return {
    collectionId,
    mode: () => modeByCollection[collectionId],

    async list(userId, filters = [], options = {}) {
      await assertSessionUser(userId)
      const ownerFilters: Filter[] = [{ field: 'owner', op: 'eq', value: userId }, ...filters]
      return withTable(
        async () => {
          const response = await databases.listDocuments<Models.Document>({
            databaseId,
            collectionId,
            queries: toQueries(ownerFilters, options),
          })
          void migrateFromPrefs(userId).catch((err) => {
            migratedUsers.delete(userId)
            console.warn(`[recordStore] ${collectionId} prefs migration failed`, err)
          })
          return response.documents as unknown as StoredRecord<T>[]
        },
        async () => {
          const records = await prefsRecords(userId)
          return applyListOptions(
            records.filter((record) => matchesFilters(record as Record<string, unknown>, ownerFilters)),
            options,
          )
        },
      )
    },

    async create(userId, data) {
      await assertSessionUser(userId)
      const payload = cleanPayload({ ...data, owner: userId })
      return withTable(
        async () =>
          (await databases.createDocument({
            databaseId,
            collectionId,
            documentId: ID.unique(),
            data: payload,
            permissions: ownerPermissions(userId),
          })) as unknown as StoredRecord<T>,
        async () => {
          const now = new Date().toISOString()
          const record = {
            ...payload,
            $id: ID.unique(),
            $createdAt: now,
            $updatedAt: now,
            owner: userId,
          } as StoredRecord<T>
          await mutatePrefs((prefs) => {
            const existing = Array.isArray(prefs[prefsKey]) ? (prefs[prefsKey] as StoredRecord<T>[]) : []
            const next = applyListOptions([record, ...existing], {
              orderBy: config.recencyField,
              desc: true,
            }).slice(0, config.fallbackLimit)
            prefs[prefsKey] = next
          })
          return record
        },
      )
    },

    async update(userId, id, patch) {
      await assertSessionUser(userId)
      const payload = cleanPayload(patch as Record<string, unknown>)
      delete payload.owner
      return withTable(
        async () => {
          const existing = await databases.getDocument({ databaseId, collectionId, documentId: id })
          if ((existing as Record<string, unknown>).owner !== userId) {
            throw new Error('Unauthorized: you can only change your own records.')
          }
          return (await databases.updateDocument({
            databaseId,
            collectionId,
            documentId: id,
            data: payload,
          })) as unknown as StoredRecord<T>
        },
        async () => {
          let updated: StoredRecord<T> | null = null
          await mutatePrefs((prefs) => {
            const existing = Array.isArray(prefs[prefsKey]) ? (prefs[prefsKey] as StoredRecord<T>[]) : []
            prefs[prefsKey] = existing.map((record) => {
              if (record.$id !== id || record.owner !== userId) return record
              updated = { ...record, ...payload, $updatedAt: new Date().toISOString() }
              return updated
            })
          })
          if (!updated) throw new Error('Record not found.')
          return updated
        },
      )
    },

    async remove(userId, id) {
      await assertSessionUser(userId)
      await withTable(
        async () => {
          const existing = await databases.getDocument({ databaseId, collectionId, documentId: id })
          if ((existing as Record<string, unknown>).owner !== userId) {
            throw new Error('Unauthorized: you can only delete your own records.')
          }
          await databases.deleteDocument({ databaseId, collectionId, documentId: id })
        },
        async () => {
          await mutatePrefs((prefs) => {
            const existing = Array.isArray(prefs[prefsKey]) ? (prefs[prefsKey] as StoredRecord<T>[]) : []
            prefs[prefsKey] = existing.filter((record) => !(record.$id === id && record.owner === userId))
          })
        },
      )
    },
  }
}

function ownerPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

/** Report which stores are running from account prefs (for the Account screen). */
export function describeStoreModes(stores: RecordStore<Record<string, unknown>>[]): { collectionId: string; mode: StoreMode | undefined }[] {
  return stores.map((store) => ({ collectionId: store.collectionId, mode: store.mode() }))
}
