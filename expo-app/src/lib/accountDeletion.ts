import { databases, storage } from './appwrite'
import {
  FOOD_CONTRIBUTIONS_COLLECTION_ID,
  FOOD_IMAGES_BUCKET_ID,
  FOODS_DATABASE_ID,
  contributionFileIdList,
  type FoodContributionDocument,
} from './foodContributionFields'
import { assertAuthenticatedUserId, deleteProfile } from './profile'
import { Query } from 'react-native-appwrite'

const MAIN_DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const MEALS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID!
const WATER_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID!
const TASKS_DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_TASKS_DATABASE_ID!
const TASKS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!

type OwnedCollection = {
  databaseId: string
  collectionId: string
  ownerField: 'owner' | 'userId'
}

const OWNED_COLLECTIONS: OwnedCollection[] = [
  { databaseId: MAIN_DATABASE_ID, collectionId: MEALS_COLLECTION_ID, ownerField: 'owner' },
  { databaseId: MAIN_DATABASE_ID, collectionId: WATER_COLLECTION_ID, ownerField: 'owner' },
  { databaseId: TASKS_DATABASE_ID, collectionId: TASKS_COLLECTION_ID, ownerField: 'userId' },
]

async function deleteOwnedDocuments(userId: string, target: OwnedCollection): Promise<void> {
  while (true) {
    const response = await databases.listDocuments({
      databaseId: target.databaseId,
      collectionId: target.collectionId,
      queries: [Query.equal(target.ownerField, userId), Query.limit(100)],
    })
    if (response.documents.length === 0) return
    await Promise.all(
      response.documents.map((document) =>
        databases.deleteDocument({
          databaseId: target.databaseId,
          collectionId: target.collectionId,
          documentId: document.$id,
        }),
      ),
    )
  }
}

async function deleteContributions(userId: string): Promise<void> {
  while (true) {
    const response = await databases.listDocuments<FoodContributionDocument>({
      databaseId: FOODS_DATABASE_ID,
      collectionId: FOOD_CONTRIBUTIONS_COLLECTION_ID,
      queries: [Query.equal('owner', userId), Query.limit(100)],
    })
    if (response.documents.length === 0) return
    await Promise.all(
      response.documents.map(async (document) => {
        for (const fileId of contributionFileIdList(document)) {
          await storage.deleteFile({
            bucketId: FOOD_IMAGES_BUCKET_ID,
            fileId,
          })
        }
        await databases.deleteDocument({
          databaseId: FOODS_DATABASE_ID,
          collectionId: FOOD_CONTRIBUTIONS_COLLECTION_ID,
          documentId: document.$id,
        })
      }),
    )
  }
}

export async function purgeAccountData(userId: string): Promise<void> {
  await assertAuthenticatedUserId(userId)
  await deleteContributions(userId)
  for (const target of OWNED_COLLECTIONS) {
    await deleteOwnedDocuments(userId, target)
  }
  await deleteProfile(userId)
}
