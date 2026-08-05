import { account, databases } from './appwrite'
import { buildMealInputFromProduct } from './mealFromProduct'
import { logAppwriteError } from './profile'
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

/** Add a scanned product to today's meal bucket for `mealType` (one doc per type per day). */
export async function addProductToMeal(
    ownerId: string,
    mealType: MealType,
    barcode: string,
    productData: Record<string, unknown>,
    servings = 1,
): Promise<MealDocument> {
  const trimmedBarcode = barcode.trim()
  if (!trimmedBarcode) {
    throw new Error('A valid barcode is required to add a product to a meal.')
  }

  // Pre-emptively clear today's meals cache for safety
  clearTodayMealsCache(ownerId)

  try {
    const productInput = buildMealInputFromProduct(ownerId, productData, mealType, trimmedBarcode, servings)

    const todayMeals = await getTodayMeals(ownerId)
    const existingMeal = todayMeals.find((meal) => meal.type === mealType)

    if (existingMeal) {
      const sum = (current: number | null | undefined, added: number | null | undefined) =>
          (current ?? 0) + (added ?? 0)

      const res = await updateMeal(existingMeal.$id, {
        friendlyname: mealType,
        kcal: sum(existingMeal.kcal, productInput.kcal),
        protein: sum(existingMeal.protein, productInput.protein),
        carbs: sum(existingMeal.carbs, productInput.carbs),
        fat: sum(existingMeal.fat, productInput.fat),
        items: [...(existingMeal.items ?? []), trimmedBarcode],
      })
      clearTodayMealsCache(ownerId)
      return res
    }

    const res = await createMeal({
      ...productInput,
      friendlyname: mealType,
      type: mealType,
      items: [trimmedBarcode],
    })
    clearTodayMealsCache(ownerId)
    return res
  } catch (err) {
    clearTodayMealsCache(ownerId)
    throw err
  }
}

type ProductNutrition = {
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

/** Move a barcode from one meal document into another meal type bucket for today. */
export async function moveProductBetweenMeals(
    ownerId: string,
    sourceMealId: string,
    barcode: string,
    targetType: MealType,
    nutrition: ProductNutrition,
): Promise<void> {
  if (isMealsConfigMissing()) {
    throw new Error('Missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID in .env')
  }

  const sessionUserId = await assertActiveSession()

  if (ownerId !== sessionUserId) {
    throw new Error('You can only move products between meals on your own profile.')
  }

  // Pre-emptively clear today's meals cache for safety
  clearTodayMealsCache(sessionUserId)

  try {
    const sourceMeal = await getMeal(sourceMealId)
    if (!sourceMeal) throw new Error('Source meal not found.')

    const trimmedBarcode = barcode.trim()
    const items = [...(sourceMeal.items ?? [])]
    const itemIndex = items.indexOf(trimmedBarcode)
    if (itemIndex === -1) throw new Error('Product not found in source meal.')

    items.splice(itemIndex, 1)

    const subtract = (current: number | null | undefined, amount: number | null | undefined) =>
        Math.max(0, (current ?? 0) - (amount ?? 0))

    if (items.length === 0) {
      await databases.deleteDocument({
        databaseId: DATABASE_ID,
        collectionId: MEALS_COLLECTION_ID,
        documentId: sourceMealId,
      })
    } else {
      await updateMeal(sourceMealId, {
        kcal: subtract(sourceMeal.kcal, nutrition.kcal),
        protein: subtract(sourceMeal.protein, nutrition.protein),
        carbs: subtract(sourceMeal.carbs, nutrition.carbs),
        fat: subtract(sourceMeal.fat, nutrition.fat),
        items,
      })
    }

    const todayMeals = await getTodayMeals(ownerId)
    const targetMeal = todayMeals.find((meal) => meal.type === targetType && meal.$id !== sourceMealId)

    const add = (current: number | null | undefined, amount: number | null | undefined) =>
        (current ?? 0) + (amount ?? 0)

    if (targetMeal) {
      await updateMeal(targetMeal.$id, {
        friendlyname: targetType,
        kcal: add(targetMeal.kcal, nutrition.kcal),
        protein: add(targetMeal.protein, nutrition.protein),
        carbs: add(targetMeal.carbs, nutrition.carbs),
        fat: add(targetMeal.fat, nutrition.fat),
        items: [...(targetMeal.items ?? []), trimmedBarcode],
      })
      clearTodayMealsCache(sessionUserId)
      return
    }

    await createMeal({
      owner: ownerId,
      friendlyname: targetType,
      type: targetType,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      nutrient_density_score: null,
      fluid: null,
      items: [trimmedBarcode],
    })

    clearTodayMealsCache(sessionUserId)
  } catch (err) {
    clearTodayMealsCache(sessionUserId)
    throw err
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

  // Pre-emptively clear today's meals cache for safety
  clearTodayMealsCache(sessionUserId)

  try {
    const res = (await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: MEALS_COLLECTION_ID,
      documentId: ID.unique(),
      data: normalized,
      permissions: mealDocumentPermissions(sessionUserId),
    })) as MealDocument

    // Clear cache again after successful creation
    clearTodayMealsCache(sessionUserId)
    return res
  } catch (err) {
    clearTodayMealsCache(sessionUserId)
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

  const sessionUserId = await assertActiveSession()
  const normalized = normalizeMealWritePayload(data)
  const validationError = validateMealPatchPayload(normalized)
  if (validationError) throw new Error(validationError)

  // Pre-emptively clear today's meals cache for safety
  clearTodayMealsCache(sessionUserId)

  try {
    const res = (await databases.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: MEALS_COLLECTION_ID,
      documentId: mealId,
      data: normalized,
    })) as MealDocument

    // Clear cache again after successful update
    clearTodayMealsCache(sessionUserId)
    return res
  } catch (err) {
    clearTodayMealsCache(sessionUserId)
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

// ⚡ Bolt: Memory Cache and Promise Deduplication for today's meals to prevent
// redundant Appwrite round-trips and simultaneous duplicate requests across different
// focus/mount effects (e.g. index/Dial and meals view loading simultaneously).
let cachedTodayMeals: { userId: string; meals: MealDocument[]; expiresAt: number } | null = null
let inflightTodayMealsPromise: Promise<MealDocument[]> | null = null
let inflightTodayMealsUserId: string | null = null

export function clearTodayMealsCache(userId: string): void {
  if (cachedTodayMeals && cachedTodayMeals.userId === userId) {
    cachedTodayMeals = null
  }
  if (inflightTodayMealsUserId === userId) {
    inflightTodayMealsPromise = null
    inflightTodayMealsUserId = null
  }
}

/** Fetch today's meals (Mirrors the fallback logic in listHistoricMeals to bypass missing index errors) */
export function getTodayMeals(userId: string): Promise<MealDocument[]> {
  if (isMealsConfigMissing()) return Promise.resolve([])

  // 1. Check if we have a valid, unexpired cached today's meals for this user
  if (cachedTodayMeals && cachedTodayMeals.userId === userId && cachedTodayMeals.expiresAt > Date.now()) {
    return Promise.resolve(cachedTodayMeals.meals)
  }

  // 2. Check if a fetch is already in progress for this same user (Deduplication)
  if (inflightTodayMealsPromise && inflightTodayMealsUserId === userId) {
    return inflightTodayMealsPromise
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartISO = todayStart.toISOString()

  const fetchFn = async (): Promise<MealDocument[]> => {
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

  inflightTodayMealsUserId = userId
  const currentPromise = fetchFn()
  inflightTodayMealsPromise = currentPromise

  currentPromise
    .then((meals) => {
      if (inflightTodayMealsPromise === currentPromise) {
        cachedTodayMeals = {
          userId,
          meals,
          expiresAt: Date.now() + 15 * 1000,
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      if (inflightTodayMealsPromise === currentPromise) {
        inflightTodayMealsPromise = null
        inflightTodayMealsUserId = null
      }
    })

  return currentPromise
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