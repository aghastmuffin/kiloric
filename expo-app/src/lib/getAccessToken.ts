import { account } from '@/lib/appwrite'
import { getCachedAccessToken } from '@/lib/apiClient'

let cachedToken: { jwt: string; expiresAt: number } | null = null
let inflightPromise: Promise<string | null> | null = null

/** JWT for `Authorization: Bearer <token>` from the active session. */
export async function getAccessToken(): Promise<string | null> {
  const clientToken = getCachedAccessToken()
  if (clientToken) return clientToken

  // 1. Check if we have a fresh token in memory
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.jwt
  }

  // 2. If already fetching a new one, deduplicate to avoid redundant round-trips
  if (inflightPromise) {
    return inflightPromise
  }

  inflightPromise = (async () => {
    try {
      if (typeof account?.createJWT === 'function') {
        const { jwt } = await account.createJWT()
        cachedToken = {
          jwt,
          expiresAt: Date.now() + 5 * 60 * 1000,
        }
        return jwt
      }
      return null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.warn('[getAccessToken] failed to create JWT:', errorMessage)
      return null
    } finally {
      inflightPromise = null
    }
  })()

  return inflightPromise
}

/** Clear any cached JWT token and any inflight fetching promise to prevent session staining/leakage on logout. */
export function clearCachedToken(): void {
  cachedToken = null
  inflightPromise = null
}
