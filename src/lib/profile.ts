import { account, databases } from '@/lib/appwrite'
import type { FitnessGoal } from '@/lib/nutrition'
import { AppwriteException, Permission, Role, type Models } from 'react-native-appwrite'

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const USER_PROFILES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!

/**
 * Must match the `role` enum values in your Appwrite collection exactly.
 * Update this union if your console enum differs.
 */
export const PROFILE_ROLE_OPTIONS = ['user'] as const

export type ProfileRole = (typeof PROFILE_ROLE_OPTIONS)[number]

export const DEFAULT_PROFILE_ROLE: ProfileRole = 'user'

/** Writable profile attributes — mirrors the Appwrite `users` collection schema. */
export type ProfileFields = {
  username: string // string, max 64, required
  email: string // email, required
  dateOfBirth: string // datetime, required
  weight: number // double 0–1000, required
  height: number // double 0–300, required
  role: ProfileRole // enum, required — must include `user`
  lastLogin?: string // datetime
  bio?: string | null // string, max 512
  country?: string | null // string, size 2
  /** Many-to-one relationship — meal document ID only; never write diet labels */
  meals?: string | null
  target_kcal?: number | null // integer
  target_protein?: number | null // integer
  target_carbs?: number | null // integer
  target_fat?: number | null // integer
  daily_fluid?: number | null // integer
  TDEE?: number | null // integer
  /** @deprecated Human-readable only. Use goal_type + goal_pace_kg_per_week for logic. */
  goal_plain?: string | null // text
  /** @deprecated Prefer goal_target_weight_kg. Kept for legacy rows. */
  target_weight?: number | null // integer
  /** @deprecated Prefer goal_pace_kg_per_week. Kept for legacy rows. */
  weekly_deficit?: number | null // integer

  // Machine-readable weight/energy goal state (see src/lib/goals.ts).
  goal_type?: FitnessGoal | null // enum: lose | maintain | gain
  goal_pace_kg_per_week?: number | null // double
  goal_start_weight_kg?: number | null // double
  goal_target_weight_kg?: number | null // double
  goal_start_date?: string | null // datetime
  goal_estimated_weeks?: number | null // integer
}

/** Required when creating the first profile document. */
export type ProfileCreate = Pick<
  ProfileFields,
  'username' | 'email' | 'dateOfBirth' | 'weight' | 'height' | 'role'
>

export type ProfileDocument = Models.Document & ProfileFields

export function isProfileComplete(profile: ProfileDocument | null): profile is ProfileDocument & ProfileCreate {
  if (!profile) return false
  return hasRequiredCreateFields(profile)
}

function hasRequiredCreateFields(data: Partial<ProfileFields>): data is ProfileCreate {
  return (
    typeof data.username === 'string' &&
    data.username.length > 0 &&
    typeof data.email === 'string' &&
    data.email.length > 0 &&
    typeof data.dateOfBirth === 'string' &&
    data.dateOfBirth.length > 0 &&
    typeof data.weight === 'number' &&
    !Number.isNaN(data.weight) &&
    typeof data.height === 'number' &&
    !Number.isNaN(data.height) &&
    typeof data.role === 'string' &&
    data.role.length > 0
  )
}

function profileDocumentPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

function isDocumentNotFound(err: unknown): boolean {
  return err instanceof AppwriteException && err.code === 404 && err.type === 'document_not_found'
}

/** Logs the full Appwrite error to the JS console so it shows in Metro / dev tools. */
export function logAppwriteError(context: string, err: unknown): void {
  if (err instanceof AppwriteException) {
    console.error(
      `[profile] ${context} failed →`,
      JSON.stringify(
        {
          code: err.code,
          type: err.type,
          message: err.message,
        },
        null,
        2,
      ),
    )
    return
  }
  console.error(`[profile] ${context} failed →`, err)
}

/** Human-readable, verbose error string for display in the app (red box). */
export function formatProfileSaveError(err: unknown): string {
  if (!(err instanceof AppwriteException)) {
    return err instanceof Error ? err.message : 'Unknown error'
  }

  const raw = `Appwrite ${err.code} (${err.type || 'error'}): ${err.message}`

  if (err.code === 401 && err.message.toLowerCase().includes('create')) {
    return [
      raw,
      '',
      'Creating a document ALWAYS needs collection-level "Create" permission.',
      'Fix in Appwrite Console → Databases → your collection → Settings → Permissions:',
      'add role "Users" and check Create. Then sign out and back in.',
      'See docs/appwrite/profiles.md',
    ].join('\n')
  }

  if (err.code === 401) {
    return `${raw}\n\nYour session may have expired. Sign out and sign in again.`
  }

  if (err.code === 404) {
    return `${raw}\n\nCheck EXPO_PUBLIC_APPWRITE_DATABASE_ID / _PROFILES_COLLECTION_ID in .env.`
  }

  if (err.type === 'relationship_value_invalid') {
    return [
      raw,
      '',
      'A collection attribute is type Relationship, but the app sent plain text.',
      'Common cause: "meals" links to meal documents — not diet labels.',
      'The app no longer writes to "meals". If another field fails, check attribute types in Console.',
    ].join('\n')
  }

  return raw
}

const CREATE_FIELD_KEYS: (keyof ProfileCreate)[] = [
  'username',
  'email',
  'dateOfBirth',
  'weight',
  'height',
  'role',
]

/** Fields the app must never write as plain strings (Appwrite Relationship columns). */
const RELATIONSHIP_FIELD_KEYS = new Set<keyof ProfileFields>(['meals'])

/** Appwrite integer columns — must be whole numbers, not floats. */
const INTEGER_FIELD_KEYS = new Set<keyof ProfileFields>([
  'target_kcal',
  'target_protein',
  'target_carbs',
  'target_fat',
  'daily_fluid',
  'TDEE',
  'target_weight',
  'weekly_deficit',
])

function roundDouble(value: number): number {
  return Math.round(value * 10) / 10
}

/** Coerce app values to types Appwrite expects before create/update. */
export function normalizeProfileWritePayload(data: Partial<ProfileFields>): Partial<ProfileFields> {
  const normalized: Partial<ProfileFields> = {}

  for (const [key, value] of Object.entries(data) as [
    keyof ProfileFields,
    ProfileFields[keyof ProfileFields],
  ][]) {
    if (RELATIONSHIP_FIELD_KEYS.has(key)) continue
    if (value === undefined) continue

    if (value === null) {
      normalized[key] = null as never
      continue
    }

    if (INTEGER_FIELD_KEYS.has(key) && typeof value === 'number') {
      normalized[key] = Math.round(value) as never
      continue
    }

    if ((key === 'weight' || key === 'height') && typeof value === 'number') {
      normalized[key] = roundDouble(value) as never
      continue
    }

    if (key === 'username' && typeof value === 'string') {
      normalized[key] = value.trim().slice(0, 64) as never
      continue
    }

    if (key === 'bio' && typeof value === 'string') {
      const trimmed = value.trim()
      normalized[key] = (trimmed ? trimmed.slice(0, 512) : null) as never
      continue
    }

    if (key === 'country' && typeof value === 'string') {
      normalized[key] = value.trim().toUpperCase().slice(0, 2) as never
      continue
    }

    normalized[key] = value as never
  }

  return normalized
}

function validateProfileWritePayload(data: Partial<ProfileFields>): string | null {
  if (data.username && data.username.length > 64) {
    return 'Username must be 64 characters or fewer.'
  }
  if (data.bio && data.bio.length > 512) {
    return 'Bio must be 512 characters or fewer.'
  }
  if (data.country && data.country.length !== 2) {
    return 'Country must be a 2-letter code (e.g. US).'
  }
  if (data.role && !PROFILE_ROLE_OPTIONS.includes(data.role)) {
    return `Role must be one of: ${PROFILE_ROLE_OPTIONS.join(', ')}`
  }
  return null
}

function pickCreatePayload(data: ProfileCreate): ProfileCreate {
  return { ...data }
}

function pickOptionalPayload(data: Partial<ProfileFields>): Partial<ProfileFields> {
  return pickWritablePayload(data, CREATE_FIELD_KEYS)
}

function pickWritablePayload(
  data: Partial<ProfileFields>,
  excludeKeys: readonly (keyof ProfileFields)[] = [],
): Partial<ProfileFields> {
  const patch: Partial<ProfileFields> = {}
  for (const [key, value] of Object.entries(data) as [keyof ProfileFields, ProfileFields[keyof ProfileFields]][]) {
    if (RELATIONSHIP_FIELD_KEYS.has(key)) continue
    if (excludeKeys.includes(key)) continue
    if (value !== undefined) {
      patch[key] = value as never
    }
  }
  return patch
}

// ⚡ Bolt: Memory Cache and Promise Deduplication for profile documents to prevent
// redundant Appwrite round-trips and simultaneous duplicate requests across different
// focus/mount effects (e.g. ProfileGate and Dial components loading concurrently).
let cachedProfile: { userId: string; profile: ProfileDocument | null; expiresAt: number } | null = null
let inflightProfilePromise: Promise<ProfileDocument | null> | null = null
let inflightProfileUserId: string | null = null

/** Create profile row keyed by Appwrite Auth user id */
export async function createProfile(userId: string, data: ProfileCreate) {
  await assertAuthenticatedUserId(userId)

  console.log('[profile] createDocument →', {
    databaseId: DATABASE_ID,
    collectionId: USER_PROFILES_COLLECTION_ID,
    documentId: userId,
  })

  // Invalidate any existing profile cache for this user
  if (cachedProfile && cachedProfile.userId === userId) {
    cachedProfile = null
  }

  const res = await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: USER_PROFILES_COLLECTION_ID,
    documentId: userId,
    data,
    permissions: profileDocumentPermissions(userId),
  })

  // Ensure any cached value is invalidated on successful creation
  if (cachedProfile && cachedProfile.userId === userId) {
    cachedProfile = null
  }

  return res
}

/**
 * Confirms an active Appwrite session before writing. Returns the auth user id,
 * or throws a clear error the UI can show.
 */
export async function assertActiveSession(): Promise<string> {
  try {
    const me = await account.get()
    console.log('[profile] active session for', me.$id)
    return me.$id
  } catch (err) {
    logAppwriteError('account.get (session check)', err)
    throw new Error(
      'No active Appwrite session. Sign out and sign in again before saving your profile.',
    )
  }
}

/**
 * Asserts that the currently logged-in user matches the requested user ID.
 * This prevents Broken Object Level Authorization (BOLA) / IDOR vulnerabilities.
 */
export async function assertAuthenticatedUserId(userId: string): Promise<string> {
  const sessionUserId = await assertActiveSession()
  if (sessionUserId !== userId) {
    throw new Error('Unauthorized: You are not permitted to modify this profile.')
  }
  return sessionUserId
}

export async function updateProfile(userId: string, data: Partial<ProfileFields>) {
  await assertAuthenticatedUserId(userId)

  // Invalidate profile cache before updating to prevent any stale reads
  if (cachedProfile && cachedProfile.userId === userId) {
    cachedProfile = null
  }

  const res = await databases.updateDocument({
    databaseId: DATABASE_ID,
    collectionId: USER_PROFILES_COLLECTION_ID,
    documentId: userId,
    data,
  })

  // Ensure profile cache is invalidated after a successful update
  if (cachedProfile && cachedProfile.userId === userId) {
    cachedProfile = null
  }

  return res
}

export async function getProfile(userId: string): Promise<ProfileDocument | null> {
  // 1. Check if we have a valid, unexpired cached profile for this user
  if (cachedProfile && cachedProfile.userId === userId && cachedProfile.expiresAt > Date.now()) {
    return cachedProfile.profile
  }

  // 2. Check if a fetch is already in progress for this same user (Deduplication)
  if (inflightProfilePromise && inflightProfileUserId === userId) {
    return inflightProfilePromise
  }

  // 3. Initiate the request with deduplication
  inflightProfileUserId = userId
  inflightProfilePromise = (async () => {
    try {
      const profile = (await databases.getDocument({
        databaseId: DATABASE_ID,
        collectionId: USER_PROFILES_COLLECTION_ID,
        documentId: userId,
      })) as ProfileDocument

      // Cache the result for 15 seconds to prevent hammering of profile reads
      cachedProfile = {
        userId,
        profile,
        expiresAt: Date.now() + 15 * 1000,
      }

      return profile
    } catch (err) {
      if (isDocumentNotFound(err)) {
        // Cache negative lookup (profile not found/not complete) briefly to prevent constant 404 queries
        cachedProfile = {
          userId,
          profile: null,
          expiresAt: Date.now() + 15 * 1000,
        }
        return null
      }
      throw err
    } finally {
      if (inflightProfileUserId === userId) {
        inflightProfilePromise = null
        inflightProfileUserId = null
      }
    }
  })()

  return inflightProfilePromise
}

/**
 * Create on first save (all required fields must be present), then patch only
 * the fields provided on later saves.
 */
export async function saveProfileFields(userId: string, data: Partial<ProfileFields>) {
  await assertAuthenticatedUserId(userId)

  const normalized = normalizeProfileWritePayload(data)
  const validationError = validateProfileWritePayload(normalized)
  if (validationError) {
    throw new Error(validationError)
  }

  let existing: ProfileDocument | null = null

  try {
    existing = await getProfile(userId)
  } catch (err) {
    logAppwriteError('getProfile', err)
    throw new Error(formatProfileSaveError(err))
  }

  if (existing) {
    try {
      return await updateProfile(userId, pickWritablePayload(normalized))
    } catch (err) {
      logAppwriteError('updateProfile', err)
      throw new Error(formatProfileSaveError(err))
    }
  }

  if (!hasRequiredCreateFields(normalized)) {
    throw new Error(
      'First profile save requires username, email, dateOfBirth, weight, height, and role.',
    )
  }

  // Verify the session is attached to the client before attempting a create.
  // A 401 on create almost always means either no session or the collection
  // lacks the "Create" permission for the Users role.
  await assertActiveSession()

  const createPayload = pickCreatePayload(normalized)
  const optionalPayload = pickOptionalPayload(normalized)

  try {
    const created = await createProfile(userId, createPayload)
    if (Object.keys(optionalPayload).length === 0) {
      return created
    }
    console.log('[profile] patching optional fields →', Object.keys(optionalPayload))
    return await updateProfile(userId, optionalPayload)
  } catch (err) {
    logAppwriteError('createProfile', err)
    throw new Error(formatProfileSaveError(err))
  }
}

/** `YYYY-MM-DD` → Appwrite datetime string */
export function dateInputToIso(date: string): string {
  return `${date}T00:00:00.000+00:00`
}

/** Local `Date` (date-only fields) → Appwrite datetime string */
export function dateToIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return dateInputToIso(`${year}-${month}-${day}`)
}

/** Clear any cached Profile document and any inflight fetching promise to prevent PII leakage on logout. */
export function clearProfileCache(): void {
  cachedProfile = null
  inflightProfilePromise = null
  inflightProfileUserId = null
}
