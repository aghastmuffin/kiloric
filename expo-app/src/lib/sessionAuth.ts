import { account } from './serverData'

let cachedUserId: string | null = null

export function setCachedUserId(id: string | null): void {
  cachedUserId = id
}

export async function getSessionUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId
  try {
    if (typeof account?.get === 'function') {
      const me = await account.get()
      if (typeof me?.$id === 'string' && me.$id) {
        return me.$id
      }
    }
  } catch (err) {
    throw err
  }
  throw new Error('No active session.')
}
