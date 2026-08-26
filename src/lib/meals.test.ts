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
      select: (fields: string[]) => `select:${fields.join(',')}`,
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
    mealsModule.clearTodayMealsCache()
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

  it('clearTodayMealsCache without a user purges every cached account', async () => {
    mockListDocuments
      .mockResolvedValueOnce({ documents: [{ $id: 'meal-a', owner: 'user-123' }] })
      .mockResolvedValueOnce({ documents: [{ $id: 'meal-b', owner: 'user-456' }] })
      .mockResolvedValueOnce({ documents: [{ $id: 'meal-a2', owner: 'user-123' }] })
      .mockResolvedValueOnce({ documents: [{ $id: 'meal-b2', owner: 'user-456' }] })

    await mealsModule.getTodayMeals('user-123')
    await mealsModule.getTodayMeals('user-456')
    mealsModule.clearTodayMealsCache()
    await mealsModule.getTodayMeals('user-123')
    await mealsModule.getTodayMeals('user-456')

    expect(mockListDocuments).toHaveBeenCalledTimes(4)
  })

  it('does not let a cleared in-flight request repopulate the meal cache', async () => {
    let resolveStale!: (value: { documents: unknown[] }) => void
    const staleDatabaseRead = new Promise<{ documents: unknown[] }>((resolve) => {
      resolveStale = resolve
    })
    const freshMeals = [{ $id: 'meal-fresh', owner: 'user-123', kcal: 900 }]
    mockListDocuments
      .mockReturnValueOnce(staleDatabaseRead)
      .mockResolvedValueOnce({ documents: freshMeals })

    const staleRequest = mealsModule.getTodayMeals('user-123')
    mealsModule.clearTodayMealsCache()
    const freshRequest = mealsModule.getTodayMeals('user-123')
    resolveStale({ documents: [{ $id: 'meal-stale', owner: 'user-123', kcal: 100 }] })

    await staleRequest
    await expect(freshRequest).resolves.toEqual(freshMeals)
    await expect(mealsModule.getTodayMeals('user-123')).resolves.toEqual(freshMeals)
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

  describe('BOLA/IDOR defense-in-depth checks', () => {
    it('updateMeal fails if user is not the owner', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({ $id: 'meal-7', owner: 'user-456', kcal: 500 }) // different owner!

      await expect(
        mealsModule.updateMeal('meal-7', { kcal: 600 })
      ).rejects.toThrow('Unauthorized: You can only update your own meals.')

      expect(mockUpdateDocument).not.toHaveBeenCalled()
    })

    it('moveProductBetweenMeals fails if user is not the owner of source meal', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({ $id: 'meal-8', owner: 'user-456', items: ['1234'] }) // different owner!

      await expect(
        mealsModule.moveProductBetweenMeals('user-123', 'meal-8', '1234', 'Lunch', { kcal: 100, protein: 10, carbs: 20, fat: 5 })
      ).rejects.toThrow('Unauthorized: You can only move products from your own meals.')

      expect(mockUpdateDocument).not.toHaveBeenCalled()
      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })
  })
})

describe('meals authorization checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updateMeal throws error if current user is not the owner', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockGetDocument.mockResolvedValue({ $id: 'meal-1', owner: 'user-456', kcal: 500 })

    await expect(
      mealsModule.updateMeal('meal-1', { kcal: 600 })
    ).rejects.toThrow('Unauthorized: You can only update your own meals.')
  })

  it('updateMeal allows updating if current user is the owner', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockGetDocument.mockResolvedValue({ $id: 'meal-1', owner: { $id: 'user-123' }, kcal: 500 })
    mockUpdateDocument.mockResolvedValue({ $id: 'meal-1', owner: 'user-123', kcal: 600 })

    const res = await mealsModule.updateMeal('meal-1', { kcal: 600 })
    expect(res.kcal).toBe(600)
    expect(mockUpdateDocument).toHaveBeenCalledTimes(1)
  })

  it('moveProductBetweenMeals throws error if requested ownerId is not current user', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })

    await expect(
      mealsModule.moveProductBetweenMeals(
        'user-456',
        'meal-1',
        '123456789',
        'Lunch',
        { kcal: 100, protein: 5, carbs: 10, fat: 2 }
      )
    ).rejects.toThrow('Unauthorized: You can only move products within your own meals.')
  })

  it('moveProductBetweenMeals throws error if source meal owner is not current user', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user-123' })
    mockGetDocument.mockResolvedValue({ $id: 'meal-1', owner: 'user-456', items: ['123456789'] })

    await expect(
      mealsModule.moveProductBetweenMeals(
        'user-123',
        'meal-1',
        '123456789',
        'Lunch',
        { kcal: 100, protein: 5, carbs: 10, fat: 2 }
      )
    ).rejects.toThrow('Unauthorized: You can only move products from your own meals.')
  })

  describe('deleteMeal', () => {
    it('deletes a meal owned by the authenticated user relationship', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })
      mockGetDocument.mockResolvedValue({ $id: 'meal-123', owner: { $id: 'user-123' } })
      mockDeleteDocument.mockResolvedValue({})
      mockListDocuments
        .mockResolvedValueOnce({ documents: [{ $id: 'meal-123', owner: 'user-123' }] })
        .mockResolvedValueOnce({ documents: [] })

      await mealsModule.getTodayMeals('user-123')
      await mealsModule.deleteMeal('user-123', 'meal-123')
      await mealsModule.getTodayMeals('user-123')

      expect(mockDeleteDocument).toHaveBeenCalledWith({
        databaseId: 'test-db',
        collectionId: 'test-col',
        documentId: 'meal-123',
      })
      expect(mockListDocuments).toHaveBeenCalledTimes(2)
    })

    it('rejects mismatched sessions, invalid IDs, and other owners', async () => {
      mockGetAccount.mockResolvedValue({ $id: 'user-123' })

      await expect(mealsModule.deleteMeal('user-456', 'meal-123')).rejects.toThrow(
        'Unauthorized: You can only delete your own meals.',
      )
      await expect(mealsModule.deleteMeal('user-123', 'invalid/meal!')).rejects.toThrow(
        'Invalid meal ID.',
      )
      await expect(mealsModule.deleteMeal('user-123', '-invalid')).rejects.toThrow(
        'Invalid meal ID.',
      )
      await expect(mealsModule.deleteMeal('user-123', 'a'.repeat(37))).rejects.toThrow(
        'Invalid meal ID.',
      )

      mockGetDocument.mockResolvedValue({ $id: 'meal-123', owner: { $id: 'user-456' } })
      await expect(mealsModule.deleteMeal('user-123', 'meal-123')).rejects.toThrow(
        'Unauthorized: You can only delete your own meals.',
      )
      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })
  })
})
