import { account, databases } from '@/lib/appwrite'
import { localDayBounds, totalWaterMl as sumWaterMl } from '@/lib/waterUtils'
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

export async function listWaterEntries(
  userId: string,
  date = new Date(),
): Promise<WaterDocument[]> {
  if (!DATABASE_ID || !WATER_COLLECTION_ID) return []
  await authenticatedUserId(userId)
  const { start, end } = localDayBounds(date)
  try {
    const response = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: WATER_COLLECTION_ID,
      queries: [
        Query.equal('owner', userId),
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
  return (await databases.createDocument({
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
}

export async function deleteWaterEntry(userId: string, documentId: string): Promise<void> {
  await authenticatedUserId(userId)
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(documentId)) throw new Error('Invalid water entry.')
  await databases.deleteDocument({
    databaseId: DATABASE_ID,
    collectionId: WATER_COLLECTION_ID,
    documentId,
  })
}

export function totalWaterMl(entries: readonly WaterFields[]): number {
  return sumWaterMl(entries)
}

export { localDayBounds, WATER_COLLECTION_ID }
