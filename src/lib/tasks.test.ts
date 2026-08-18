// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const {
  mockListDocuments,
  mockCreateDocument,
  mockUpdateDocument,
  mockDeleteDocument,
  mockGetDocument,
  mockGetAccount,
} = vi.hoisted(() => {
  return {
    mockListDocuments: vi.fn(),
    mockCreateDocument: vi.fn(),
    mockUpdateDocument: vi.fn(),
    mockDeleteDocument: vi.fn(),
    mockGetDocument: vi.fn(),
    mockGetAccount: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: {
      listDocuments: mockListDocuments,
      createDocument: mockCreateDocument,
      updateDocument: mockUpdateDocument,
      deleteDocument: mockDeleteDocument,
      getDocument: mockGetDocument,
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
      unique: () => 'mock-task-id',
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
      equal: (key: string, val: unknown) => `equal:${key}:${val}`,
      orderDesc: (key: string) => `orderDesc:${key}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

process.env.EXPO_PUBLIC_APPWRITE_TASKS_DATABASE_ID = 'test-tasks-db'
process.env.EXPO_PUBLIC_APPWRITE_TASKS_COLLECTION_ID = 'test-tasks-col'

let tasksModule: typeof import('./tasks')

beforeAll(async () => {
  tasksModule = await import('./tasks')
})

describe('tasks security & authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setTaskDone', () => {
    it('throws error if expected userId does not match session user', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        tasksModule.setTaskDone('user-456', 'task-1', true),
      ).rejects.toThrow('You can only change your own tasks.')

      expect(mockGetDocument).not.toHaveBeenCalled()
      expect(mockUpdateDocument).not.toHaveBeenCalled()
    })

    it('throws error if task is not found', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      const AppwriteEx = (await import('react-native-appwrite')).AppwriteException
      mockGetDocument.mockRejectedValue(new AppwriteEx('Not found', 404, 'document_not_found'))

      await expect(
        tasksModule.setTaskDone('user-123', 'task-99', true),
      ).rejects.toThrow('Task not found.')

      expect(mockUpdateDocument).not.toHaveBeenCalled()
    })

    it('throws authorization error if task belongs to a different user (BOLA/IDOR)', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'task-1',
        userId: 'user-456', // owned by user-456
        title: 'Drink Water',
        done: false,
      })

      await expect(
        tasksModule.setTaskDone('user-123', 'task-1', true),
      ).rejects.toThrow('Unauthorized: You can only modify your own tasks.')

      expect(mockUpdateDocument).not.toHaveBeenCalled()
    })

    it('successfully updates task status if user owns the task', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'task-1',
        userId: 'user-123',
        title: 'Drink Water',
        done: false,
      })
      mockUpdateDocument.mockResolvedValue({
        $id: 'task-1',
        userId: 'user-123',
        title: 'Drink Water',
        done: true,
      })

      const updated = await tasksModule.setTaskDone('user-123', 'task-1', true)

      expect(updated.done).toBe(true)
      expect(mockUpdateDocument).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteTask', () => {
    it('throws error if expected userId does not match session user', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        tasksModule.deleteTask('user-456', 'task-1'),
      ).rejects.toThrow('You can only change your own tasks.')

      expect(mockGetDocument).not.toHaveBeenCalled()
      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('throws error if task is not found', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      const AppwriteEx = (await import('react-native-appwrite')).AppwriteException
      mockGetDocument.mockRejectedValue(new AppwriteEx('Not found', 404, 'document_not_found'))

      await expect(
        tasksModule.deleteTask('user-123', 'task-99'),
      ).rejects.toThrow('Task not found.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('throws authorization error if task belongs to a different user (BOLA/IDOR)', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'task-1',
        userId: 'user-456', // owned by user-456
        title: 'Drink Water',
        done: false,
      })

      await expect(
        tasksModule.deleteTask('user-123', 'task-1'),
      ).rejects.toThrow('Unauthorized: You can only delete your own tasks.')

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })

    it('successfully deletes task if user owns the task', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({
        $id: 'task-1',
        userId: 'user-123',
        title: 'Drink Water',
        done: false,
      })
      mockDeleteDocument.mockResolvedValue({})

      await tasksModule.deleteTask('user-123', 'task-1')

      expect(mockDeleteDocument).toHaveBeenCalledWith({
        databaseId: 'test-tasks-db',
        collectionId: 'test-tasks-col',
        documentId: 'task-1',
      })
    })
  })
})
