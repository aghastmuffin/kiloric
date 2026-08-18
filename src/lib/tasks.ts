import { account, databases } from './appwrite'
import { AppwriteException, ID, Permission, Query, Role, type Models } from 'react-native-appwrite'

const TASKS_DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_TASKS_DATABASE_ID ?? 'tasks'
const TASKS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_TASKS_COLLECTION_ID ?? 'tasks'

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

export async function listTasks(userId: string): Promise<TaskDocument[]> {
  if (!TASKS_DATABASE_ID || !TASKS_COLLECTION_ID) return []
  await authenticatedUserId(userId)
  try {
    const response = await databases.listDocuments({
      databaseId: TASKS_DATABASE_ID,
      collectionId: TASKS_COLLECTION_ID,
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ],
    })
    return response.documents as unknown as TaskDocument[]
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return []
    throw error
  }
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

  return (await databases.createDocument({
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
}

export async function getTask(taskId: string): Promise<TaskDocument | null> {
  if (!TASKS_DATABASE_ID || !TASKS_COLLECTION_ID) return null
  try {
    return (await databases.getDocument({
      databaseId: TASKS_DATABASE_ID,
      collectionId: TASKS_COLLECTION_ID,
      documentId: taskId,
    })) as TaskDocument
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null
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

  return (await databases.updateDocument({
    databaseId: TASKS_DATABASE_ID,
    collectionId: TASKS_COLLECTION_ID,
    documentId: taskId,
    data: { done },
  })) as TaskDocument
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
}

export { TASKS_COLLECTION_ID, TASKS_DATABASE_ID }
