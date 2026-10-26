import { Platform } from 'react-native'
import { Account, Client, Databases, Storage } from 'react-native-appwrite'

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 'default'

function getPlatformId(): string {
  const nativeId =
    process.env.EXPO_PUBLIC_APPWRITE_PLATFORM_ID ?? 'co.taeson.kiloric'

  if (Platform.OS === 'web') {
    return (
      process.env.EXPO_PUBLIC_APPWRITE_PLATFORM_WEB ??
      (typeof window !== 'undefined' ? window.location.hostname : nativeId)
    )
  }

  return nativeId
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(getPlatformId())

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export { client }
