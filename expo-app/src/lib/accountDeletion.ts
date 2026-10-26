import { apiClient } from './apiClient'
import { assertAuthenticatedUserId } from './profile'

/** Deletes the account and every owned record through the server's cascade. */
export async function purgeAccountData(userId: string): Promise<void> {
  await assertAuthenticatedUserId(userId)
  await apiClient.delete('/v1/me')
}
