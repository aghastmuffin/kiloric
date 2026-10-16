import { account } from './appwrite'

export async function getSessionUserId(): Promise<string> {
  const me = await account.get()
  return me.$id
}
