import { apiClient } from './apiClient'

let cachedUserId: string | null = null

export function setCachedUserId(id: string | null): void {
  cachedUserId = id
}

export async function getSessionUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId
  const me = await apiClient.get<{ $id: string }>('/v1/me')
  cachedUserId = me.$id
  return me.$id
}
