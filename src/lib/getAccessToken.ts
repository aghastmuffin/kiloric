import { account } from '@/lib/appwrite'
import { logAppwriteError } from '@/lib/apiErrors'

let cachedToken: { jwt: string; expiresAt: number } | null = null
let inflightPromise: Promise<string | null> | null = null

/** JWT for `Authorization: Bearer <token>` — minted from the active Appwrite session. */
export async function getAccessToken(): Promise<string | null> {
  // 1. Check if we have a fresh token in memory
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.jwt
  }

  // 2. If already fetching a new one, deduplicate to avoid redundant Appwrite round-trips
  if (inflightPromise) {
    return inflightPromise
  }

  inflightPromise = (async () => {
    try {
      const { jwt } = await account.createJWT()

      // Cache for 5 minutes to balance responsiveness and security
      // Appwrite JWTs typically last 15 minutes
      cachedToken = {
        jwt,
        expiresAt: Date.now() + 5 * 60 * 1000,
      }

      return jwt
    } catch (err) {
      logAppwriteError('createJWT', err)
      return null
    } finally {
      inflightPromise = null
    }
  })()

  return inflightPromise
}
