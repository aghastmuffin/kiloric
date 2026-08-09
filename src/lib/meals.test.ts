// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// Create hoisted mock functions
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

// Mock transitive dependencies using the hoisted functions
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

vi.mock('./profile', () => {
  return {
    logAppwriteError: vi.fn(),
  }
})

vi.mock('./mealFromProduct', () => {
  return {
    buildMealInputFromProduct: vi.fn(),
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
      unique: () => 'mock-unique-id',
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
      greaterThanEqual: (key: string, val: any) => `gte:${key}:${val}`,
      orderDesc: (key: string) => `orderDesc:${key}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

// Set up environment variables
process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID = 'test-col'

// Dynamically import meals module inside beforeAll to avoid ES module hoisting/TDZ issues
let mealsModule: any

beforeAll(async () => {
  mealsModule = await import('./meals')
})

describe('meals caching & deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mealsModule.clearTodayMealsCache('user-123')
  })

  it('getTodayMeals returns meals and caches them', async () => {
    const mockMeals = [{ $id: 'meal-1', owner: 'user-123', kcal: 500 }]
    mockListDocuments.mockResolvedValueOnce({ documents: mockMeals })

    // First call: hits databases.listDocuments
    const result1 = await mealsModule.getTodayMeals('user-123')
    expect(result1).toEqual(mockMeals)
    expect(mockListDocuments).toHaveBeenCalledTimes(1)

    // Second call (immediate): should hit cache, NOT databases.listDocuments
    const result2 = await mealsModule.getTodayMeals('user-123')
    expect(result2).toEqual(mockMeals)
    expect(mockListDocuments).toHaveBeenCalledTimes(1)
  })

  it('getTodayMeals deduplicates concurrent parallel requests', async () => {
    const mockMeals = [{ $id: 'meal-2', owner: 'user-123', kcal: 600 }]

    // We mock listDocuments to return after a brief delay
    let resolvePromise: any
    const delayPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockListDocuments.mockImplementation(() => delayPromise)

    // Fire off both requests in parallel
    const p1 = mealsModule.getTodayMeals('user-123')
    const p2 = mealsModule.getTodayMeals('user-123')

    // They must be exact same promise reference
    expect(p1).toBe(p2)

    resolvePromise({ documents: mockMeals })

    const res1 = await p1
    const res2 = await p2
    expect(res1).toEqual(mockMeals)
    expect(res2).toEqual(mockMeals)
    expect(mockListDocuments).toHaveBeenCalledTimes(1)
  })

  it('clearTodayMealsCache invalidates cached entries', async () => {
    const mockMeals = [{ $id: 'meal-3', owner: 'user-123', kcal: 700 }]
    mockListDocuments.mockResolvedValue({ documents: mockMeals })

    await mealsModule.getTodayMeals('user-123')
    expect(mockListDocuments).toHaveBeenCalledTimes(1)

    // Clear cache
    mealsModule.clearTodayMealsCache('user-123')

    // Next call should query DB again
    await mealsModule.getTodayMeals('user-123')
    expect(mockListDocuments).toHaveBeenCalledTimes(2)
  })

  it('mutations invalidate cached entries', async () => {
    const mockMeals = [{ $id: 'meal-4', owner: 'user-123', kcal: 800 }]
    mockListDocuments.mockResolvedValue({ documents: mockMeals })

    await mealsModule.getTodayMeals('user-123')
    expect(mockListDocuments).toHaveBeenCalledTimes(1)

    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockCreateDocument.mockResolvedValue({ $id: 'meal-new', owner: 'user-123' })

    // Call createMeal (which should invalidate cache)
    await mealsModule.createMeal({ owner: 'user-123', kcal: 200 })

    // Next call should query DB again
    await mealsModule.getTodayMeals('user-123')
    expect(mockListDocuments).toHaveBeenCalledTimes(2)
  })
})

describe('meals authorization (BOLA/IDOR protection)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateMeal', () => {
    it('succeeds if the meal exists and is owned by the logged-in user', async () => {
      const mockMeal = { $id: 'meal-123', owner: 'user-123', kcal: 500 }
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue(mockMeal)
      mockUpdateDocument.mockResolvedValue({ ...mockMeal, kcal: 600 })

      const result = await mealsModule.updateMeal('meal-123', { kcal: 600 })
      expect(result.kcal).toBe(600)
      expect(mockGetDocument).toHaveBeenCalledWith({
        databaseId: 'test-db',
        collectionId: 'test-col',
        documentId: 'meal-123',
      })
      expect(mockUpdateDocument).toHaveBeenCalledTimes(1)
    })

    it('throws if the meal is not found', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      const { AppwriteException } = await import('react-native-appwrite')
      mockGetDocument.mockRejectedValue(new AppwriteException('Not Found', 404, 'document_not_found'))

      await expect(mealsModule.updateMeal('meal-123', { kcal: 600 })).rejects.toThrow('Meal not found.')
      expect(mockUpdateDocument).not.toHaveBeenCalled()
    })

    it('throws an unauthorized error if the meal is owned by another user', async () => {
      const mockMeal = { $id: 'meal-123', owner: 'user-456', kcal: 500 }
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue(mockMeal)

      await expect(mealsModule.updateMeal('meal-123', { kcal: 600 })).rejects.toThrow(
        'Unauthorized: You are not permitted to modify this meal.'
      )
      expect(mockUpdateDocument).not.toHaveBeenCalled()
    })
  })

  describe('moveProductBetweenMeals', () => {
    it('throws if ownerId does not match the active session user', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(
        mealsModule.moveProductBetweenMeals('user-456', 'meal-123', '12345', 'Lunch', {
          kcal: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
        })
      ).rejects.toThrow('Unauthorized: You can only move products for your own meals.')
    })

    it('throws if the source meal is owned by another user', async () => {
      const mockMeal = { $id: 'meal-123', owner: 'user-456', items: ['12345'], kcal: 500 }
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue(mockMeal)

      await expect(
        mealsModule.moveProductBetweenMeals('user-123', 'meal-123', '12345', 'Lunch', {
          kcal: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
        })
      ).rejects.toThrow('Unauthorized: You are not permitted to modify this meal.')
    })
  })
})
