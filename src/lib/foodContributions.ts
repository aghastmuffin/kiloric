/**
 * Food contributions — Appwrite transport for the standalone contribute module.
 *
 * Public field names are Open Food Facts (OFF). Mapping lives in
 * `foodContributionFields.ts` so UI + tests stay transport-agnostic.
 * Swap this file when moving to Oracle; keep the `submitFoodContribution` signature.
 *
 * Photos → `images_to_check` bucket. Rows → `food_contributions` in the `foods` DB.
 */
import { account, databases, storage } from './appwrite'
import {
  buildContributionPayload,
  type FoodContributionFieldsInput,
} from './foodContributionFields'
import { ID, Permission, Role, type Models } from 'react-native-appwrite'

export {
  OFF_TO_APPWRITE,
  STRING_OFF_FIELDS,
  NUMBER_OFF_FIELDS,
  buildContributionPayload,
  type OffStringField,
  type OffNumberField,
} from './foodContributionFields'

const FOODS_DATABASE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_FOODS_DATABASE_ID ?? '6a4577f00008c718d204'
const COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_FOOD_CONTRIBUTIONS_COLLECTION_ID ?? 'food_contributions'
const BUCKET_ID =
  process.env.EXPO_PUBLIC_APPWRITE_FOOD_IMAGES_BUCKET_ID ?? '6a32e0dd000f9dee7b98'

export type FoodContributionPhoto = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
  fileSize?: number | null
}

export type FoodContributionInput = FoodContributionFieldsInput & {
  photo: FoodContributionPhoto
  additionalPhotos?: FoodContributionPhoto[]
}

export type FoodContributionResult = {
  id: string
  photoFileId: string
  status: string
}

export type FoodContributionDocument = Models.Document & {
  owner: string
  status: string
  photo_file_id: string
  product_name: string
  source_query?: string | null
  code?: string | null
  image_url?: string | null
}

function guessMime(uri: string, mimeType?: string | null): string {
  if (mimeType && mimeType.startsWith('image/')) return mimeType
  const lower = uri.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  return 'image/jpeg'
}

function guessFileName(uri: string, fileName?: string | null, mime?: string): string {
  if (fileName && fileName.trim()) return fileName.trim()
  const ext = mime === 'image/png' ? 'png' : 'jpg'
  return `food-contribution.${ext}`
}

async function authenticatedUserId(expectedUserId: string): Promise<string> {
  const user = await account.get()
  if (user.$id !== expectedUserId) {
    throw new Error('You can only submit contributions as yourself.')
  }
  return user.$id
}

async function resolveFileSize(uri: string, known?: number | null): Promise<number> {
  if (typeof known === 'number' && Number.isFinite(known) && known > 0) return known
  const response = await fetch(uri)
  const blob = await response.blob()
  if (!blob.size) throw new Error('Could not read photo file size.')
  return blob.size
}

/**
 * Upload photo + create a pending contribution document.
 * Requires product_name and photo. All other OFF fields are optional.
 */
export async function submitFoodContribution(
  userId: string,
  input: FoodContributionInput,
): Promise<FoodContributionResult> {
  const owner = await authenticatedUserId(userId)

  if (!input.photo?.uri?.trim()) {
    throw new Error('A photo is required when adding a new food.')
  }

  // Early input validation: validate payload schema prior to file uploads
  // to avoid creating orphaned files in storage if payload validation fails.
  buildContributionPayload({
    owner,
    photo_file_id: 'validation_placeholder',
    product_name: input.product_name,
    code: input.code,
    source_query: input.source_query,
    fields: input.fields,
  })

  const uploadedFiles: Models.File[] = []
  for (const [index, photo] of [input.photo, ...(input.additionalPhotos ?? [])].entries()) {
    const mime = guessMime(photo.uri, photo.mimeType)
    if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/jpg') {
      throw new Error('Photos must be JPG or PNG files.')
    }
    const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime
    const size = await resolveFileSize(photo.uri, photo.fileSize)
    if (size > 10_000_000) throw new Error('Each photo must be 10 MB or smaller.')
    const uploaded = await storage.createFile({
      bucketId: BUCKET_ID,
      fileId: ID.unique(),
      file: {
        name: `${index + 1}-${guessFileName(photo.uri, photo.fileName, normalizedMime)}`,
        type: normalizedMime,
        size,
        uri: photo.uri,
      },
      permissions: [Permission.read(Role.user(owner)), Permission.update(Role.user(owner)), Permission.delete(Role.user(owner))],
    })
    uploadedFiles.push(uploaded)
  }
  const uploaded = uploadedFiles[0]

  const payload = buildContributionPayload({
    owner,
    photo_file_id: uploaded.$id,
    product_name: input.product_name,
    code: input.code,
    source_query: input.source_query,
    fields: {
      ...input.fields,
      ...(uploadedFiles.length > 1 ? { image_url: `appwrite-files://${uploadedFiles.map((file) => file.$id).join(',')}` } : {}),
    },
  })

  try {
    const doc = await databases.createDocument<FoodContributionDocument>({
      databaseId: FOODS_DATABASE_ID,
      collectionId: COLLECTION_ID,
      documentId: ID.unique(),
      data: payload,
      permissions: [
        Permission.read(Role.user(owner)),
        Permission.update(Role.user(owner)),
        Permission.delete(Role.user(owner)),
      ],
    })

    return {
      id: doc.$id,
      photoFileId: uploaded.$id,
      status: doc.status ?? 'pending',
    }
  } catch (error) {
    try {
      await Promise.all(uploadedFiles.map((file) => storage.deleteFile({ bucketId: BUCKET_ID, fileId: file.$id })))
    } catch {
      // ignore cleanup failure
    }
    throw error
  }
}

export {
  FOODS_DATABASE_ID,
  COLLECTION_ID as FOOD_CONTRIBUTIONS_COLLECTION_ID,
  BUCKET_ID as FOOD_IMAGES_BUCKET_ID,
}
