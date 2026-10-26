/** Compatibility boundary for existing feature stores during the API migration.
 * User data always uses the same bearer session as authentication.
 */
import { AppwriteException, type Account, type Databases } from 'react-native-appwrite'
import { ApiError, apiClient, getAccessToken } from './apiClient'

type DocumentArgs = {
  databaseId: string
  collectionId: string
  documentId?: string
  data?: Record<string, unknown>
  queries?: string[]
}
const routes: Record<string, string> = {
  [process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID || 'meals']: 'meals',
  [process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID || 'water_logs']: 'water',
  [process.env.EXPO_PUBLIC_APPWRITE_TASKS_COLLECTION_ID || 'tasks']: 'tasks',
  food_entries: 'food-entries', saved_meals: 'saved-meals',
  meal_plan_entries: 'meal-plan-entries', prep_sessions: 'prep-sessions',
  grocery_items: 'grocery-items', workouts: 'workouts', workout_sets: 'workout-sets',
  weight_logs: 'weight-logs',
}
const profilesId = process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'users'

async function compatible<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation() } catch (error) {
    if (error instanceof ApiError) {
      throw new AppwriteException(error.message, error.status, error.status === 404 ? 'document_not_found' : 'api_error')
    }
    throw error
  }
}

export const apiAccount = {
  get: () => apiClient.get('/v1/me'),
  getPrefs: () => apiClient.get('/v1/me/prefs'),
  updatePrefs: ({ prefs }: { prefs: Record<string, unknown> }) => apiClient.patch('/v1/me/prefs', { prefs }),
  createJWT: async () => ({ jwt: await getAccessToken() }),
} as unknown as Account

export function createApiDatabases(legacy: Databases): Databases {
  function path(args: DocumentArgs, item = false): string | null {
    if (args.collectionId === profilesId) return '/v1/me'
    const route = routes[args.collectionId]
    return route ? `/v1/${route}${item ? `/${encodeURIComponent(args.documentId || '')}` : ''}` : null
  }
  return {
    async listDocuments(args: DocumentArgs) {
      const route = path(args)
      if (!route) return legacy.listDocuments(args)
      return compatible(() => apiClient.get(route, { queries: JSON.stringify(args.queries || []) }))
    },
    async getDocument(args: DocumentArgs) {
      const route = path(args, true)
      if (!route) return legacy.getDocument({ ...args, documentId: args.documentId || '' })
      return compatible(() => apiClient.get(route))
    },
    async createDocument(args: DocumentArgs) {
      const route = path(args)
      if (!route) return legacy.createDocument({ ...args, documentId: args.documentId || '', data: args.data || {} })
      return compatible(() => args.collectionId === profilesId
        ? apiClient.patch(route, args.data) : apiClient.post(route, args.data))
    },
    async updateDocument(args: DocumentArgs) {
      const route = path(args, true)
      if (!route) return legacy.updateDocument({ ...args, documentId: args.documentId || '', data: args.data || {} })
      return compatible(() => apiClient.patch(route, args.data))
    },
    async deleteDocument(args: DocumentArgs) {
      const route = path(args, true)
      if (!route) return legacy.deleteDocument({ ...args, documentId: args.documentId || '' })
      if (args.collectionId === profilesId) throw new Error('Use account deletion to delete your profile.')
      return compatible(() => apiClient.delete(route))
    },
  } as unknown as Databases
}
