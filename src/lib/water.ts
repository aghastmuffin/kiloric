import { account, databases } from './appwrite'
import { localDayBounds, totalWaterMl as sumWaterMl } from './waterUtils'
import { AppwriteException, ID, Permission, Query, Role, type Models } from 'react-native-appwrite'

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const WATER_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID ?? 'water_logs'

export type WaterFields = {
  owner: string
  amount_ml: number
  consumed_at: string
}

export type WaterDocument = Models.Document & WaterFields

function validateAmount(amountMl: number): number {
  if (!Number.isFinite(amountMl) || amountMl < 25 || amountMl > 4000) {
    throw new Error('Water amount must be between 25 ml and 4000 ml.')
  }
  return Math.round(amountMl)
}

async function authenticatedUserId(expectedUserId: string): Promise<string> {
  const user = await account.get()
  if (user.$id !== expectedUserId) throw new Error('You can only change your own water log.')
  return user.$id
}

type WaterCacheEntry = {
  entries: WaterDocument[]
  expiresAt: number
}

const cachedWaterEntries: Record<string, WaterCacheEntry> = {}
const inflightWaterPromises: Record<string, Promise<WaterDocument[]>> = {}

export function clearWaterCache(userId?: string): void {
  for (const key of Object.keys(cachedWaterEntries)) {
    if (!userId || key.startsWith(`${userId}:`)) delete cachedWaterEntries[key]
  }
  for (const key of Object.keys(inflightWaterPromises)) {
    if (!userId || key.startsWith(`${userId}:`)) delete inflightWaterPromises[key]
  }
}

export function listWaterEntries(
  userId: string,
  date = new Date(),
): Promise<WaterDocument[]> {
  if (!DATABASE_ID || !WATER_COLLECTION_ID) return Promise.resolve([])

  const { start, end } = localDayBounds(date)
  const cacheKey = `${userId}:${start.toISOString()}`
  const inflight = inflightWaterPromises[cacheKey]
  if (inflight) return inflight

  const currentPromise = authenticatedUserId(userId).then(async (sessionUserId) => {
    const cached = cachedWaterEntries[cacheKey]
    if (cached && cached.expiresAt > Date.now()) return cached.entries

    try {
      const response = await databases.listDocuments({
        databaseId: DATABASE_ID,
        collectionId: WATER_COLLECTION_ID,
        queries: [
          Query.equal('owner', sessionUserId),
          Query.greaterThanEqual('consumed_at', start.toISOString()),
          Query.lessThan('consumed_at', end.toISOString()),
          Query.orderDesc('consumed_at'),
          Query.limit(100),
        ],
      })
      return response.documents as unknown as WaterDocument[]
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) return []
      throw error
    }
  })

  inflightWaterPromises[cacheKey] = currentPromise
  currentPromise
    .then((entries) => {
      if (inflightWaterPromises[cacheKey] === currentPromise) {
        cachedWaterEntries[cacheKey] = { entries, expiresAt: Date.now() + 15_000 }
      }
    })
    .catch(() => undefined)
    .finally(() => {
      if (inflightWaterPromises[cacheKey] === currentPromise) {
        delete inflightWaterPromises[cacheKey]
      }
    })

  return currentPromise
}

export async function addWaterEntry(
  userId: string,
  amountMl: number,
  consumedAt = new Date(),
): Promise<WaterDocument> {
  const owner = await authenticatedUserId(userId)
  const amount = validateAmount(amountMl)
  if (Number.isNaN(consumedAt.getTime()) || consumedAt > new Date(Date.now() + 5 * 60_000)) {
    throw new Error('Water time is invalid.')
  }
  const document = (await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: WATER_COLLECTION_ID,
    documentId: ID.unique(),
    data: {
      owner,
      amount_ml: amount,
      consumed_at: consumedAt.toISOString(),
    },
    permissions: [
      Permission.read(Role.user(owner)),
      Permission.update(Role.user(owner)),
      Permission.delete(Role.user(owner)),
    ],
  })) as WaterDocument
  clearWaterCache(owner)
  return document
}

export async function deleteWaterEntry(userId: string, documentId: string): Promise<void> {
  const sessionUserId = await authenticatedUserId(userId)
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(documentId)) throw new Error('Invalid water entry.')

  // Defense in depth: Verify document ownership to prevent BOLA/IDOR vulnerabilities
  const entry = (await databases.getDocument({
    databaseId: DATABASE_ID,
    collectionId: WATER_COLLECTION_ID,
    documentId,
  })) as WaterDocument

  if (!entry) {
    throw new Error('Water log entry not found.')
  }

  if (entry.owner !== sessionUserId) {
    throw new Error('Unauthorized: You can only delete your own water logs.')
  }

  await databases.deleteDocument({
    databaseId: DATABASE_ID,
    collectionId: WATER_COLLECTION_ID,
    documentId,
  })
  clearWaterCache(sessionUserId)
}

export function totalWaterMl(entries: readonly WaterFields[]): number {
  return sumWaterMl(entries)
}

export { localDayBounds, WATER_COLLECTION_ID }
