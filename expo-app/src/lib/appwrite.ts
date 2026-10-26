import { apiAccount, apiStorage, createApiDatabases } from './apiPersistence'
import { Platform } from 'react-native'
import { Client, Databases } from 'react-native-appwrite'

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

export const account = apiAccount
export const databases = createApiDatabases(new Databases(client))
export const storage = apiStorage
export { client }
