import { ApiError, apiClient, getAccessToken } from './apiClient'
import {
  PersistenceError,
  type DocumentArgs,
  type ServerAccount,
  type ServerDatabase,
  type ServerStorage,
} from './serverTypes'

const routes: Record<string, string> = {
  meals: 'meals',
  water_logs: 'water',
  tasks: 'tasks',
  food_entries: 'food-entries',
  saved_meals: 'saved-meals',
  meal_plan_entries: 'meal-plan-entries',
  prep_sessions: 'prep-sessions',
  grocery_items: 'grocery-items',
  workouts: 'workouts',
  workout_sets: 'workout-sets',
  weight_logs: 'weight-logs',
  food_contributions: 'food-contributions',
}

const PROFILE_RESOURCE = 'users'

async function compatible<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ApiError) {
      throw new PersistenceError(
        error.message,
        error.status,
        error.status === 404 ? 'document_not_found' : 'api_error',
      )
    }
    throw error
  }
}

function resourcePath(args: DocumentArgs, item = false): string {
  if (args.collectionId === PROFILE_RESOURCE) return '/v1/me'
  const route = routes[args.collectionId]
  if (!route) throw new PersistenceError(`Unknown server resource: ${args.collectionId}`, 500, 'resource_not_configured')
  return `/v1/${route}${item ? `/${encodeURIComponent(args.documentId || '')}` : ''}`
}

export const account: ServerAccount = {
  get: () => apiClient.get('/v1/me'),
  getPrefs: () => apiClient.get('/v1/me/prefs'),
  updatePrefs: ({ prefs }) => apiClient.patch('/v1/me/prefs', { prefs }),
  createJWT: async () => ({ jwt: await getAccessToken() }),
}

export const database: ServerDatabase = {
  listDocuments: (args) => compatible(() => apiClient.get(resourcePath(args), { queries: JSON.stringify(args.queries || []) })),
  getDocument: (args) => compatible(() => apiClient.get(resourcePath(args, true))),
  createDocument: (args) => compatible(() =>
    args.collectionId === PROFILE_RESOURCE
      ? apiClient.patch(resourcePath(args), args.data || {})
      : apiClient.post(resourcePath(args), args.data || {}),
  ),
  updateDocument: (args) => compatible(() => apiClient.patch(resourcePath(args, true), args.data || {})),
  deleteDocument: (args) => compatible(() => apiClient.delete(resourcePath(args, true))),
}

export const storage: ServerStorage = {
  deleteFile: ({ fileId }) => apiClient.delete(`/v1/files/${encodeURIComponent(fileId)}`),
}
