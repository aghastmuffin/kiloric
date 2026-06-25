import { account, databases } from '@/lib/appwrite'
import { logAppwriteError } from '@/lib/profile'
import { AppwriteException, ID, Permission, Role, Query, type Models } from 'react-native-appwrite'

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const MEALS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID!

/** Must match the `type` enum values in Appwrite Console exactly. */
export const MEAL_TYPE_OPTIONS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Other',
] as const

export type MealType = (typeof MEAL_TYPE_OPTIONS)[number]

export type MealFields = {
  owner: string
  friendlyname?: string | null
  type?: MealType | null
  kcal?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  nutrient_density_score?: number | null
  fluid?: number | null
  items?: string[] | null
}

export type MealDocument = Models.Document & MealFields
export type CreateMealInput = MealFields

const INTEGER_FIELD_KEYS = new Set<keyof MealFields>([
  'kcal',
  'protein',
  'carbs',
  'fat',
  'fluid',
])

function mealDocumentPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

function isMealsConfigMissing(): boolean {
  return !DATABASE_ID || !MEALS_COLLECTION_ID
}

export function normalizeMealWritePayload(data: Partial<MealFields>): Partial<MealFields> {
  const normalized: Partial<MealFields> = {}

  for (const [key, value] of Object.entries(data) as [keyof MealFields, MealFields[keyof MealFields]][]) {
    if (value === undefined) continue

    if (value === null) {
      normalized[key] = null as never
      continue
    }

    if (key === 'owner' && typeof value === 'string') {
      normalized.owner = value.trim()
      continue
    }

    if (key === 'friendlyname' && typeof value === 'string') {
      const trimmed = value.trim()
      normalized.friendlyname = trimmed || null
      continue
    }

    if (key === 'type' && typeof value === 'string') {
      normalized.type = value as MealType
      continue
    }

    if (INTEGER_FIELD_KEYS.has(key) && typeof value === 'number') {
      normalized[key] = Math.round(value) as never
      continue
    }

    if (key === 'nutrient_density_score' && typeof value === 'number') {
      normalized.nutrient_density_score = Math.round(value * 100) / 100
      continue
    }

    if (key === 'items' && Array.isArray(value)) {
      const barcodes = value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean)
      normalized.items = barcodes.length > 0 ? barcodes : null
      continue
    }

    normalized[key] = value as never
  }

  return normalized
}

function validateMealWritePayload(data: Partial<MealFields>): string | null {
  if (!data.owner?.trim()) {
    return 'owner (profile id) is required.'
  }
  return validateMealPatchPayload(data)
}

function validateMealPatchPayload(data: Partial<MealFields>): string | null {
  if (data.type && !MEAL_TYPE_OPTIONS.includes(data.type)) {
    return `type must be one of: ${MEAL_TYPE_OPTIONS.join(', ')}`
  }
  if (data.kcal != null && (data.kcal < 0 || data.kcal > 50000)) {
    return 'kcal must be between 0 and 50000.'
  }
  if (
      data.nutrient_density_score != null &&
      (data.nutrient_density_score < 0 || data.nutrient_density_score > 100)
  ) {
    return 'nutrient_density_score must be between 0 and 100.'
  }
  return null
}

async function assertActiveSession(): Promise<string> {
  try {
    const me = await account.get()
    return me.$id
  } catch (err) {
    logAppwriteError('account.get (meal session check)', err)
    throw new Error('No active Appwrite session. Sign in before logging a meal.')
  }
}

export async function createMeal(input: CreateMealInput): Promise<MealDocument> {
  if (isMealsConfigMissing()) {
    throw new Error('Missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID in .env')
  }

  const normalized = normalizeMealWritePayload(input)
  const validationError = validateMealWritePayload(normalized)
  if (validationError) throw new Error(validationError)

  const sessionUserId = await assertActiveSession()
  const ownerId = normalized.owner!.trim()

  if (ownerId !== sessionUserId) {
    throw new Error('You can only create meals for your own profile.')
  }

  try {
    return (await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: MEALS_COLLECTION_ID,
      documentId: ID.unique(),
      data: normalized,
      permissions: mealDocumentPermissions(sessionUserId),
    })) as MealDocument
  } catch (err) {
    logAppwriteError('createMeal', err)
    throw new Error(formatMealError(err))
  }
}

export async function getMeal(mealId: string): Promise<MealDocument | null> {
  if (isMealsConfigMissing()) return null

  try {
    return (await databases.getDocument({
      databaseId: DATABASE_ID,
      collectionId: MEALS_COLLECTION_ID,
      documentId: mealId,
    })) as MealDocument
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null
    throw err
  }
}

export async function updateMeal(
    mealId: string,
    data: Partial<Omit<MealFields, 'owner'>>,
): Promise<MealDocument> {
  if (isMealsConfigMissing()) {
    throw new Error('Missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID in .env')
  }

  await assertActiveSession()
  const normalized = normalizeMealWritePayload(data)
  const validationError = validateMealPatchPayload(normalized)
  if (validationError) throw new Error(validationError)

  try {
    return (await databases.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: MEALS_COLLECTION_ID,
      documentId: mealId,
      data: normalized,
    })) as MealDocument
  } catch (err) {
    logAppwriteError('updateMeal', err)
    throw new Error(formatMealError(err))
  }
}

export function formatMealError(err: unknown): string {
  if (!(err instanceof AppwriteException)) {
    return err instanceof Error ? err.message : 'Unknown meal error'
  }
  const raw = `Appwrite ${err.code} (${err.type || 'error'}): ${err.message}`
  if (err.code === 401 && err.message.toLowerCase().includes('create')) {
    return [raw, '', 'Grant Users → Create on the meals collection in Appwrite Console.', 'See docs/appwrite/meals.md'].join('\n')
  }
  if (err.type === 'relationship_value_invalid') {
    return `${raw}\n\nowner must be a valid profile document id (auth user id).`
  }
  return raw
}

/** Fetch today's meals (Mirrors the fallback logic in listHistoricMeals to bypass missing index errors) */
export async function getTodayMeals(userId: string): Promise<MealDocument[]> {
  if (isMealsConfigMissing()) return []

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartISO = todayStart.toISOString()

  try {
    const response = await databases.listDocuments(
        DATABASE_ID,
        MEALS_COLLECTION_ID,
        [
          Query.equal('owner', userId),
          Query.greaterThanEqual('$createdAt', todayStartISO),
        ]
    )
    return response.documents as MealDocument[]
  } catch (err) {
    console.warn('[getTodayMeals] Optimized query failed (likely missing index). Falling back to client-side filtering.', err)

    // SAFE FALLBACK: Same as listHistoricMeals to guarantee results without the composite index
    try {
      const response = await databases.listDocuments(
          DATABASE_ID,
          MEALS_COLLECTION_ID,
          [
            Query.equal('owner', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]
      )
      return (response.documents as MealDocument[]).filter((doc) => new Date(doc.$createdAt) >= todayStart)
    } catch (fallbackErr) {
      logAppwriteError('getTodayMeals fallback', fallbackErr)
      throw new Error(formatMealError(fallbackErr))
    }
  }
}

export async function listHistoricMeals(userId: string, limit = 20, offset = 0): Promise<MealDocument[]> {
  if (isMealsConfigMissing()) return []

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartISO = todayStart.toISOString()

  try {
    const response = await databases.listDocuments(
        DATABASE_ID,
        MEALS_COLLECTION_ID,
        [
          Query.equal('owner', userId),
          Query.lessThan('$createdAt', todayStartISO),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset),
        ]
    )
    return response.documents as MealDocument[]
  } catch (err) {
    console.warn('[listHistoricMeals] Optimized query failed (likely missing index). Falling back to client-side filtering.', err)

    try {
      const response = await databases.listDocuments(
          DATABASE_ID,
          MEALS_COLLECTION_ID,
          [
            Query.equal('owner', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(100),
          ]
      )
      const filtered = response.documents.filter((doc) => new Date(doc.$createdAt) < todayStart)
      return filtered.slice(offset, offset + limit) as MealDocument[]
    } catch (fallbackErr) {
      logAppwriteError('listHistoricMeals fallback', fallbackErr)
      throw new Error(formatMealError(fallbackErr))
    }
  }
}

export { MEALS_COLLECTION_ID }