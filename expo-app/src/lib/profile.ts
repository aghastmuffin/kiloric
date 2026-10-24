import { AppwriteException, Permission, Role, type Models } from 'react-native-appwrite'
import { databases } from './appwrite'
import { getSessionUserId } from './sessionAuth'
import { isUserBlockedError, notifyUserBlocked } from './userBlocked'
import type { ActivityLevel, DietStyle, FitnessGoal, GoalPace, Sex } from './nutrition'
import { isRaceValue, type RaceValue } from './residency'

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
  country?: string | null // string, size 2 — country of residence
  race?: RaceValue | null // self-reported race
  resides_in_asia?: boolean | null // explicit "yes" to residing in any Asian country
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

  // Calculation inputs (formula v5). Optional so older rows and unprovisioned schemas keep working.
  sex?: Sex | null // enum: female | male
  activity_level?: ActivityLevel | null // enum
  body_fat_pct?: number | null // double 3–60
  diet_style?: DietStyle | null // enum
  goal_pace?: GoalPace | null // enum: gentle | moderate | aggressive
  bmr?: number | null // integer
  formula_version?: number | null // integer
}

/**
 * Columns added with formula v5. Until they're provisioned, Appwrite rejects them as
 * unknown attributes, so writes retry without them (the same values live in account prefs).
 */
export const EXTENDED_PROFILE_KEYS = [
  'sex',
  'activity_level',
  'body_fat_pct',
  'diet_style',
  'goal_pace',
  'bmr',
  'formula_version',
] as const satisfies readonly (keyof ProfileFields)[]

/** Demographic columns added after formula v5. Missing columns must not drop the v5 fields. */
export const DEMOGRAPHIC_PROFILE_KEYS = ['race', 'resides_in_asia'] as const satisfies readonly (keyof ProfileFields)[]

let extendedColumnsMissing = false
let demographicColumnsMissing = false

export function isUnknownAttributeError(err: unknown): boolean {
  return (
    err instanceof AppwriteException &&
    err.code === 400 &&
    (err.type === 'document_invalid_structure' || err.type === 'row_invalid_structure') &&
    /unknown attribute/i.test(err.message)
  )
}

export function withoutKeys(
  data: Partial<ProfileFields>,
  keys: readonly (keyof ProfileFields)[],
): Partial<ProfileFields> {
  const copy = { ...data }
  for (const key of keys) delete copy[key]
  return copy
}

export function withoutExtendedKeys(data: Partial<ProfileFields>): Partial<ProfileFields> {
  return withoutKeys(data, EXTENDED_PROFILE_KEYS)
}

function messageMentionsKey(err: unknown, key: string): boolean {
  const message = err instanceof Error ? err.message : ''
  return message.includes(`"${key}"`) || message.includes(`'${key}'`) || message.includes(key)
}

function narrowUnknownAttributes(data: Partial<ProfileFields>, err: unknown): Partial<ProfileFields> | null {
  let next = data
  let changed = false
  const demographicHit = DEMOGRAPHIC_PROFILE_KEYS.some(
    (key) => next[key] !== undefined && messageMentionsKey(err, key),
  )
  const extendedHit = EXTENDED_PROFILE_KEYS.some(
    (key) => next[key] !== undefined && messageMentionsKey(err, key),
  )

  if (demographicHit) {
    demographicColumnsMissing = true
    next = withoutKeys(next, DEMOGRAPHIC_PROFILE_KEYS)
    changed = true
  }
  if (extendedHit) {
    extendedColumnsMissing = true
    next = withoutKeys(next, EXTENDED_PROFILE_KEYS)
    changed = true
  }
  if (changed) return next

  const hasDemographic = DEMOGRAPHIC_PROFILE_KEYS.some((key) => next[key] !== undefined)
  const hasExtended = EXTENDED_PROFILE_KEYS.some((key) => next[key] !== undefined)
  if (!hasDemographic && !hasExtended) return null
  if (hasDemographic) demographicColumnsMissing = true
  if (hasExtended) extendedColumnsMissing = true
  return withoutKeys(withoutKeys(next, DEMOGRAPHIC_PROFILE_KEYS), EXTENDED_PROFILE_KEYS)
}

async function writeWithSchemaFallback<T>(
  data: Partial<ProfileFields>,
  write: (payload: Partial<ProfileFields>) => Promise<T>,
): Promise<T> {
  let payload = data
  if (demographicColumnsMissing) payload = withoutKeys(payload, DEMOGRAPHIC_PROFILE_KEYS)
  if (extendedColumnsMissing) payload = withoutKeys(payload, EXTENDED_PROFILE_KEYS)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await write(payload)
    } catch (err) {
      if (!isUnknownAttributeError(err) || attempt === 2) throw err
      const next = narrowUnknownAttributes(payload, err)
      if (!next) throw err
      payload = next
    }
  }
  return write(payload)
}

/** Test hook: forget whether optional columns were found missing. */
export function resetProfileSchemaProbe(): void {
  extendedColumnsMissing = false
  demographicColumnsMissing = false
}

/** Required when creating the first profile document. */
export type ProfileCreate = Pick<
  ProfileFields,
  'username' | 'email' | 'dateOfBirth' | 'weight' | 'height' | 'role'
>

export type ProfileDocument = Models.Document & ProfileFields

export function isProfileComplete(profile: ProfileDocument | null): profile is ProfileDocument & ProfileCreate {
  if (!profile) return false
  return (
    hasRequiredCreateFields(profile) &&
    hasFinitePositiveNumber(profile.target_kcal) &&
    hasFiniteNonNegativeNumber(profile.target_protein) &&
    hasFiniteNonNegativeNumber(profile.target_carbs) &&
    hasFiniteNonNegativeNumber(profile.target_fat) &&
    hasFinitePositiveNumber(profile.daily_fluid) &&
    hasFinitePositiveNumber(profile.TDEE) &&
    typeof profile.goal_type === 'string' &&
    profile.goal_type.length > 0
  )
}

function hasFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function hasFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
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
    if (isUserBlockedError(err)) {
      notifyUserBlocked(err)
    }
    return
  }
  if (isUserBlockedError(err)) {
    notifyUserBlocked(err)
  }
  console.error(`[profile] ${context} failed →`, err)
}

/** Concise user-facing profile error. Technical details stay in diagnostics. */
export function formatProfileSaveError(err: unknown): string {
  if (!(err instanceof AppwriteException)) {
    return err instanceof Error && err.message.startsWith('First profile save')
      ? 'Your profile is missing required information. Review each setup step and try again.'
      : 'We couldn’t save your profile. Check your connection and try again.'
  }

  if (err.code === 401) {
    return 'Your session expired. Sign out, sign in again, and retry.'
  }
  return 'We couldn’t save your profile. Check your connection and try again.'
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
  'goal_estimated_weeks',
  'bmr',
  'formula_version',
])

/** Appwrite double columns — keep one decimal place. */
const DOUBLE_FIELD_KEYS = new Set<keyof ProfileFields>([
  'weight',
  'height',
  'goal_pace_kg_per_week',
  'goal_start_weight_kg',
  'goal_target_weight_kg',
  'body_fat_pct',
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

    if (DOUBLE_FIELD_KEYS.has(key) && typeof value === 'number') {
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

    if (key === 'race' && typeof value === 'string') {
      const trimmed = value.trim().slice(0, 64)
      normalized[key] = (isRaceValue(trimmed) ? trimmed : null) as never
      continue
    }

    if (key === 'resides_in_asia') {
      normalized[key] = (value === true ? true : value === false ? false : null) as never
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
  if (data.race && !isRaceValue(data.race)) {
    return 'Race must be one of the listed options.'
  }
  if (data.role && !PROFILE_ROLE_OPTIONS.includes(data.role)) {
    return `Role must be one of: ${PROFILE_ROLE_OPTIONS.join(', ')}`
  }
  return null
}

function pickCreatePayload(data: ProfileCreate): ProfileCreate {
  return {
    username: data.username,
    email: data.email,
    dateOfBirth: data.dateOfBirth,
    weight: data.weight,
    height: data.height,
    role: data.role,
  }
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
    return await getSessionUserId()
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

export async function deleteProfile(userId: string): Promise<void> {
  await assertAuthenticatedUserId(userId)
  try {
    await databases.deleteDocument({
      databaseId: DATABASE_ID,
      collectionId: USER_PROFILES_COLLECTION_ID,
      documentId: userId,
    })
  } catch (err) {
    if (!isDocumentNotFound(err)) throw err
  } finally {
    clearProfileCache()
  }
}

export async function getProfile(userId: string): Promise<ProfileDocument | null> {
  // Assert user ownership before retrieving profile document to prevent BOLA/IDOR vulnerabilities
  await assertAuthenticatedUserId(userId)

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
      return await writeWithSchemaFallback(pickWritablePayload(normalized), (payload) => updateProfile(userId, payload))
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
    return await writeWithSchemaFallback(optionalPayload, (payload) => updateProfile(userId, payload))
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
