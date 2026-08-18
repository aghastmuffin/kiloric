// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const {
  mockGetDocument,
  mockCreateDocument,
  mockUpdateDocument,
  mockDeleteDocument,
  mockGetAccount,
} = vi.hoisted(() => {
  return {
    mockGetDocument: vi.fn(),
    mockCreateDocument: vi.fn(),
    mockUpdateDocument: vi.fn(),
    mockDeleteDocument: vi.fn(),
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
})
