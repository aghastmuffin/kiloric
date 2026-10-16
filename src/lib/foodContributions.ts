/**
 * Food contributions — Appwrite transport for the standalone contribute module.
 *
 * Public field names are Open Food Facts (OFF). Mapping lives in
 * `foodContributionFields.ts` so UI + tests stay transport-agnostic.
 *
 * Photos → `images_to_check` bucket. Rows → `food_contributions` in the `foods` DB.
 */
import { Platform } from 'react-native'
import { ID, Permission, Query, Role, type Models } from 'react-native-appwrite'
import { account, databases, storage } from './appwrite'
import {
  FOOD_CONTRIBUTIONS_COLLECTION_ID as COLLECTION_ID,
  FOOD_IMAGES_BUCKET_ID as BUCKET_ID,
  FOODS_DATABASE_ID,
  buildContributionPayload,
  contributionFileColumns,
  encodeContributionFiles,
  fallbackProductName,
  primaryFileId,
  type ContributionFileIds,
  type ContributionPhotoKind,
  type FoodContributionDocument,
  type FoodContributionFieldsInput,
} from './foodContributionFields'
import { prepareImageForUpload, uploadImageToBucket, type ImageSource } from './imageUpload'
import { isUnknownAttributeError } from './profile'

export {
  CONTRIBUTION_PHOTO_KINDS,
  FOOD_CONTRIBUTIONS_COLLECTION_ID,
  FOOD_IMAGES_BUCKET_ID,
  FOODS_DATABASE_ID,
  OFF_TO_APPWRITE,
  STRING_OFF_FIELDS,
  NUMBER_OFF_FIELDS,
  buildContributionPayload,
  decodeContributionFiles,
  encodeContributionFiles,
  type ContributionFileIds,
  type ContributionPhotoKind,
  type FoodContributionDocument,
  type OffStringField,
  type OffNumberField,
} from './foodContributionFields'


export type ContributionPhoto = ImageSource & { kind: ContributionPhotoKind }

export type FoodContributionResult = {
  id: string
  status: string
  files: ContributionFileIds
  /** False when the collection lacks the file columns and IDs went into `image_url`. */
  storedInColumns: boolean
}

let fileColumnsMissing = false

export function resetContributionSchemaProbe(): void {
  fileColumnsMissing = false
}

function ownerPermissions(owner: string): string[] {
  return [Permission.read(Role.user(owner)), Permission.update(Role.user(owner)), Permission.delete(Role.user(owner))]
}

export async function confirmContributor(expectedUserId: string): Promise<string> {
  const user = await account.get()
  if (user.$id !== expectedUserId) throw new Error('You can only submit contributions as yourself.')
  return user.$id
}

/** Uploads one photo and returns its file ID. Safe to call again for a photo that failed. */
export async function uploadContributionPhoto(
  owner: string,
  photo: ContributionPhoto,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const image = await prepareImageForUpload(photo, `contribution-${photo.kind}`)
  onProgress?.(0.02)
  const file = await uploadImageToBucket({
    bucketId: BUCKET_ID,
    fileId: ID.unique(),
    image,
    permissions: ownerPermissions(owner),
    onProgress,
  })
  return file.$id
}

export function addFileId(files: ContributionFileIds, kind: ContributionPhotoKind, fileId: string): ContributionFileIds {
  if (kind === 'extra') return { ...files, extra: [...(files.extra ?? []), fileId] }
  return { ...files, [kind]: fileId }
}

/**
 * Creates the pending row. Uses the dedicated file columns when the collection has them,
 * otherwise packs the labelled IDs into `image_url` so reviewers still know which is which.
 */
export async function createContributionRecord(
  owner: string,
  input: FoodContributionFieldsInput & { files: ContributionFileIds },
): Promise<FoodContributionResult> {
  const photoFileId = primaryFileId(input.files)
  if (!photoFileId) throw new Error('Add at least one photo before sending.')

  const payload = buildContributionPayload({
    owner,
    photo_file_id: photoFileId,
    product_name: input.product_name.trim() || fallbackProductName(input.code),
    code: input.code,
    source_query: input.source_query,
    fields: input.fields,
  })
  const create = (data: Record<string, unknown>) =>
    databases.createDocument<FoodContributionDocument>({
      databaseId: FOODS_DATABASE_ID,
      collectionId: COLLECTION_ID,
      documentId: ID.unique(),
      data: data as Omit<FoodContributionDocument, keyof Models.Document>,
      permissions: ownerPermissions(owner),
    })

  if (!fileColumnsMissing) {
    try {
      const doc = await create({ ...payload, ...contributionFileColumns(input.files), submitted_from: Platform.OS })
      return { id: doc.$id, status: doc.status ?? 'pending', files: input.files, storedInColumns: true }
    } catch (error) {
      if (!isUnknownAttributeError(error)) throw error
      fileColumnsMissing = true
    }
  }
  const doc = await create({ ...payload, image_url: encodeContributionFiles(input.files) })
  return { id: doc.$id, status: doc.status ?? 'pending', files: input.files, storedInColumns: false }
}

/** Removes uploaded photos when the user abandons a submission. Best effort. */
export async function discardContributionFiles(files: ContributionFileIds): Promise<void> {
  const ids = [files.front, files.barcode, files.ingredients, files.nutrition, ...(files.extra ?? [])].filter(
    (id): id is string => Boolean(id),
  )
  await Promise.all(ids.map((fileId) => storage.deleteFile({ bucketId: BUCKET_ID, fileId }).catch(() => undefined)))
}

export async function countContributions(owner: string): Promise<number | null> {
  try {
    const list = await databases.listDocuments({
      databaseId: FOODS_DATABASE_ID,
      collectionId: COLLECTION_ID,
      queries: [Query.equal('owner', owner), Query.limit(1)],
    })
    return list.total
  } catch {
    return null
  }
}
