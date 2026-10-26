import { account, databases } from './serverData'
import { PersistenceError, ID, Permission, Query, Role, type Models } from '@/lib/serverTypes'

const TASKS_DATABASE_ID = 'kiloric'
const TASKS_COLLECTION_ID = 'tasks'

const TITLE_MAX = 256
const DESCRIPTION_MAX = 1000

export type TaskFields = {
  userId: string
  title: string
  description?: string | null
  done?: boolean | null
}

export type TaskDocument = Models.Document & TaskFields

function normalizeTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Task title is required.')
  if (trimmed.length > TITLE_MAX) {
    throw new Error(`Task title must be ${TITLE_MAX} characters or fewer.`)
  }
  return trimmed
}

function normalizeDescription(description?: string | null): string | undefined {
  if (description == null) return undefined
  const trimmed = description.trim()
  if (!trimmed) return undefined
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new Error(`Task description must be ${DESCRIPTION_MAX} characters or fewer.`)
  }
  return trimmed
}

async function authenticatedUserId(expectedUserId: string): Promise<string> {
  const user = await account.get()
  if (user.$id !== expectedUserId) throw new Error('You can only change your own tasks.')
  return user.$id
}

type TasksCacheEntry = {
  tasks: TaskDocument[]
  expiresAt: number
}

// ⚡ Bolt: In-memory TTL cache and promise deduplication map for listTasks
// to eliminate redundant database calls during dashboard focus transitions.
const cachedTasks: { [userId: string]: TasksCacheEntry } = {}
const inflightTasksPromises: { [userId: string]: Promise<TaskDocument[]> } = {}

/** Clear any cached tasks and inflight request promises to guarantee safe mutations and session purges. */
export function clearTasksCache(userId?: string): void {
  if (userId) {
    delete cachedTasks[userId]
    delete inflightTasksPromises[userId]
  } else {
    for (const key of Object.keys(cachedTasks)) {
      delete cachedTasks[key]
    }
    for (const key of Object.keys(inflightTasksPromises)) {
      delete inflightTasksPromises[key]
    }
  }
}

export function listTasks(userId: string): Promise<TaskDocument[]> {
  if (!TASKS_DATABASE_ID || !TASKS_COLLECTION_ID) return Promise.resolve([])

  // Return inflight promise if a request for this user is already pending (Deduplication)
  const inflight = inflightTasksPromises[userId]
  if (inflight) {
    return inflight
  }

  // Always verify authenticated session before returning cached or fetched data
  const currentPromise = authenticatedUserId(userId).then(async (sessionUserId) => {
    const cached = cachedTasks[sessionUserId]
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tasks
    }

    try {
      const response = await databases.listDocuments({
        databaseId: TASKS_DATABASE_ID,
        collectionId: TASKS_COLLECTION_ID,
        queries: [
          Query.equal('userId', sessionUserId),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ],
      })
      return response.documents as unknown as TaskDocument[]
    } catch (error) {
      if (error instanceof PersistenceError && error.code === 404) return []
      throw error
    }
  })

  inflightTasksPromises[userId] = currentPromise

  // Chain background caching callbacks outside closure to avoid TDZ (TS2454) warnings
  currentPromise
    .then((tasks) => {
      if (inflightTasksPromises[userId] === currentPromise) {
        cachedTasks[userId] = {
          tasks,
          expiresAt: Date.now() + 15_000, // 15s TTL
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      if (inflightTasksPromises[userId] === currentPromise) {
        delete inflightTasksPromises[userId]
      }
    })

  return currentPromise
}

export async function createTask(
  userId: string,
  input: { title: string; description?: string | null },
): Promise<TaskDocument> {
  const owner = await authenticatedUserId(userId)
  const title = normalizeTitle(input.title)
  const description = normalizeDescription(input.description)
  const data: TaskFields = {
    userId: owner,
    title,
    done: false,
  }
  if (description) data.description = description

  const doc = (await databases.createDocument({
    databaseId: TASKS_DATABASE_ID,
    collectionId: TASKS_COLLECTION_ID,
    documentId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.user(owner)),
      Permission.update(Role.user(owner)),
      Permission.delete(Role.user(owner)),
    ],
  })) as TaskDocument

  clearTasksCache(owner)
  return doc
}

export async function getTask(taskId: string): Promise<TaskDocument | null> {
  if (!TASKS_DATABASE_ID || !TASKS_COLLECTION_ID) return null
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(taskId)) return null
  try {
    return (await databases.getDocument({
      databaseId: TASKS_DATABASE_ID,
      collectionId: TASKS_COLLECTION_ID,
      documentId: taskId,
    })) as TaskDocument
  } catch (err) {
    if (err instanceof PersistenceError && err.code === 404) return null
    throw err
  }
}

export async function setTaskDone(
  userId: string,
  taskId: string,
  done: boolean,
): Promise<TaskDocument> {
  const sessionUserId = await authenticatedUserId(userId)
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(taskId)) throw new Error('Invalid task.')

  const existingTask = await getTask(taskId)
  if (!existingTask) throw new Error('Task not found.')
  if (existingTask.userId !== sessionUserId) {
    throw new Error('Unauthorized: You can only update your own tasks.')
  }

  const res = (await databases.updateDocument({
    databaseId: TASKS_DATABASE_ID,
    collectionId: TASKS_COLLECTION_ID,
    documentId: taskId,
    data: { done },
  })) as TaskDocument

  clearTasksCache(sessionUserId)
  return res
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const sessionUserId = await authenticatedUserId(userId)
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(taskId)) throw new Error('Invalid task.')

  const existingTask = await getTask(taskId)
  if (!existingTask) throw new Error('Task not found.')
  if (existingTask.userId !== sessionUserId) {
    throw new Error('Unauthorized: You can only delete your own tasks.')
  }

  await databases.deleteDocument({
    databaseId: TASKS_DATABASE_ID,
    collectionId: TASKS_COLLECTION_ID,
    documentId: taskId,
  })

  clearTasksCache(sessionUserId)
}

export { TASKS_COLLECTION_ID, TASKS_DATABASE_ID }
