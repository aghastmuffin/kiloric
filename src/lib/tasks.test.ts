// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const {
  mockGetDocument,
  mockCreateDocument,
  mockUpdateDocument,
  mockDeleteDocument,
  mockListDocuments,
  mockGetAccount,
} = vi.hoisted(() => {
  return {
    mockGetDocument: vi.fn(),
    mockCreateDocument: vi.fn(),
    mockUpdateDocument: vi.fn(),
    mockDeleteDocument: vi.fn(),
    mockListDocuments: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: {
      getDocument: mockGetDocument,
      createDocument: mockCreateDocument,
      updateDocument: mockUpdateDocument,
      deleteDocument: mockDeleteDocument,
      listDocuments: mockListDocuments,
    },
    account: {
      get: mockGetAccount,
    },
  }
})

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {
      code: number
      type: string
      constructor(message: string, code: number, type: string) {
        super(message)
        this.code = code
        this.type = type
      }
    },
    ID: {
      unique: () => 'task-123',
    },
    Permission: {
      read: () => 'read',
      update: () => 'update',
      delete: () => 'delete',
    },
    Role: {
      user: (id: string) => `user:${id}`,
    },
    Query: {
      equal: (key: string, val: any) => `equal:${key}:${val}`,
      orderDesc: (key: string) => `orderDesc:${key}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

process.env.EXPO_PUBLIC_APPWRITE_TASKS_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_TASKS_COLLECTION_ID = 'test-col'

let tasksModule: any

beforeAll(async () => {
  tasksModule = await import('./tasks')
})

describe('tasks BOLA / IDOR security tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('setTaskDone succeeds when user owns the task', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockGetDocument.mockResolvedValue({ $id: 'task-1', userId: 'user-1', done: false })
    mockUpdateDocument.mockResolvedValue({ $id: 'task-1', userId: 'user-1', done: true })

    const res = await tasksModule.setTaskDone('user-1', 'task-1', true)
    expect(res.done).toBe(true)
    expect(mockUpdateDocument).toHaveBeenCalledTimes(1)
  })

  it('setTaskDone fails when task belongs to another user (BOLA protection)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockGetDocument.mockResolvedValue({ $id: 'task-1', userId: 'user-2', done: false })

    await expect(tasksModule.setTaskDone('user-1', 'task-1', true)).rejects.toThrow(
      'Unauthorized: You can only update your own tasks.',
    )
    expect(mockUpdateDocument).not.toHaveBeenCalled()
  })

  it('setTaskDone fails when task does not exist', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockGetDocument.mockResolvedValue(null)

    await expect(tasksModule.setTaskDone('user-1', 'task-1', true)).rejects.toThrow('Task not found.')
    expect(mockUpdateDocument).not.toHaveBeenCalled()
  })

  it('deleteTask succeeds when user owns the task', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockGetDocument.mockResolvedValue({ $id: 'task-1', userId: 'user-1' })

    await tasksModule.deleteTask('user-1', 'task-1')
    expect(mockDeleteDocument).toHaveBeenCalledTimes(1)
  })

  it('deleteTask fails when task belongs to another user (BOLA protection)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockGetDocument.mockResolvedValue({ $id: 'task-1', userId: 'user-2' })

    await expect(tasksModule.deleteTask('user-1', 'task-1')).rejects.toThrow(
      'Unauthorized: You can only delete your own tasks.',
    )
    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('deleteTask fails when task does not exist', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockGetDocument.mockResolvedValue(null)

    await expect(tasksModule.deleteTask('user-1', 'task-1')).rejects.toThrow('Task not found.')
    expect(mockDeleteDocument).not.toHaveBeenCalled()
  })

  it('listTasks rejects when requesting tasks for another user ID (BOLA protection)', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })

    await expect(tasksModule.listTasks('user-2')).rejects.toThrow(
      'You can only change your own tasks.',
    )
    expect(mockListDocuments).not.toHaveBeenCalled()
  })
})

describe('tasks caching and deduplication tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tasksModule.clearTasksCache()
  })

  it('deduplicates concurrent listTasks requests', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockListDocuments.mockResolvedValue({
      documents: [{ $id: 'task-1', userId: 'user-1', title: 'Task 1' }],
    })

    const p1 = tasksModule.listTasks('user-1')
    const p2 = tasksModule.listTasks('user-1')

    expect(p1).toBe(p2)
    const [res1, res2] = await Promise.all([p1, p2])
    expect(res1).toEqual(res2)
    expect(mockListDocuments).toHaveBeenCalledTimes(1)
  })

  it('serves cached tasks on subsequent calls within TTL', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockListDocuments.mockResolvedValue({
      documents: [{ $id: 'task-1', userId: 'user-1', title: 'Task 1' }],
    })

    const first = await tasksModule.listTasks('user-1')
    expect(mockListDocuments).toHaveBeenCalledTimes(1)

    const second = await tasksModule.listTasks('user-1')
    expect(second).toEqual(first)
    expect(mockListDocuments).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache when createTask is called', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-1' })
    mockListDocuments.mockResolvedValue({
      documents: [{ $id: 'task-1', userId: 'user-1', title: 'Task 1' }],
    })
    mockCreateDocument.mockResolvedValue({ $id: 'task-2', userId: 'user-1', title: 'Task 2' })

    await tasksModule.listTasks('user-1')
    expect(mockListDocuments).toHaveBeenCalledTimes(1)

    await tasksModule.createTask('user-1', { title: 'Task 2' })

    await tasksModule.listTasks('user-1')
    expect(mockListDocuments).toHaveBeenCalledTimes(2)
  })
})
