import { getAccessToken as getSessionAccessToken } from './apiClient'

/** Returns the bearer token for the current Kiloric API session. */
export function getAccessToken(): Promise<string | null> {
  return getSessionAccessToken()
}

/** Session token state is owned and cleared by apiClient. */
export function clearCachedToken(): void {}
