import { account } from '@/lib/appwrite'

/** JWT for `Authorization: Bearer <token>` — minted from the active Appwrite session. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { jwt } = await account.createJWT()
    return jwt
  } catch {
    return null
  }
}
