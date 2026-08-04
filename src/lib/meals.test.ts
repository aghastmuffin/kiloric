// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Set process.env so module loads don't throw config missing errors
process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db'
process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID = 'test-meals'
process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT = 'test-endpoint'
process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID = 'test-project'

// Define vitest mock functions as hoisted to avoid "Cannot access before initialization" errors
const hoistedMocks = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
    mockListDocuments: vi.fn(),
    mockCreateDocument: vi.fn(),
    mockUpdateDocument: vi.fn(),
    mockGetDocument: vi.fn(),
    mockLogAppwriteError: vi.fn(),
    mockBuildMealInputFromProduct: vi.fn(),
  }
})

// Mock react-native-appwrite
vi.mock('react-native-appwrite', () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      setEndpoint: vi.fn().mockReturnThis(),
      setProject: vi.fn().mockReturnThis(),
      setPlatform: vi.fn().mockReturnThis(),
    })),
    Account: vi.fn(),
    Databases: vi.fn(),
    Permission: {
      read: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    Role: {
      user: vi.fn(),
    },
    ID: {
      unique: vi.fn(() => 'unique-id'),
    },
    Query: {
      equal: vi.fn(),
      greaterThanEqual: vi.fn(),
      orderDesc: vi.fn(),
      limit: vi.fn(),
    },
    AppwriteException: class extends Error {
      code: number
      type: string
      constructor(message: string, code: number, type: string) {
        super(message)
        this.code = code
        this.type = type
      }
    },
  }
})

vi.mock('./appwrite', () => {
  return {
    account: {
      get: hoistedMocks.mockGet,
    },
    databases: {
      listDocuments: hoistedMocks.mockListDocuments,
      createDocument: hoistedMocks.mockCreateDocument,
      updateDocument: hoistedMocks.mockUpdateDocument,
      getDocument: hoistedMocks.mockGetDocument,
    },
  }
})

vi.mock('./profile', () => {
  return {
    logAppwriteError: hoistedMocks.mockLogAppwriteError,
  }
})

vi.mock('./mealFromProduct', () => {
  return {
    buildMealInputFromProduct: hoistedMocks.mockBuildMealInputFromProduct,
  }
})

// Use dynamic import for meals as recommended by memory to handle ES module hoisting
let getTodayMeals: any
let clearTodayMealsCache: any
let createMeal: any
let updateMeal: any

describe('Today Meals Caching and Deduplication', () => {
  const userId = 'user-123'
  const mockMeals = [
    { $id: 'meal-1', owner: userId, type: 'Breakfast', kcal: 500, items: ['123456'] },
  ] as any[]

  beforeAll(async () => {
    const mealsModule = await import('./meals')
    getTodayMeals = mealsModule.getTodayMeals
    clearTodayMealsCache = mealsModule.clearTodayMealsCache
    createMeal = mealsModule.createMeal
    updateMeal = mealsModule.updateMeal
  })

  beforeEach(() => {
    vi.clearAllMocks()
    clearTodayMealsCache(userId)
  })

  it('should fetch today meals and cache the response', async () => {
    hoistedMocks.mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: mockMeals,
    })

    // First call: should query database
    const meals1 = await getTodayMeals(userId)
    expect(meals1).toEqual(mockMeals)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(1)

    // Second call: should return cached results instantly without database query
    const meals2 = await getTodayMeals(userId)
    expect(meals2).toEqual(mockMeals)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(1)
  })

  it('should deduplicate multiple concurrent identical queries', async () => {
    hoistedMocks.mockListDocuments.mockResolvedValue({
      total: 1,
      documents: mockMeals,
    })

    // Trigger multiple requests at the exact same time
    const [res1, res2, res3] = await Promise.all([
      getTodayMeals(userId),
      getTodayMeals(userId),
      getTodayMeals(userId),
    ])

    expect(res1).toEqual(mockMeals)
    expect(res2).toEqual(mockMeals)
    expect(res3).toEqual(mockMeals)

    // Only one database call should have been triggered
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(1)
  })

  it('should invalidate cache when clearTodayMealsCache is explicitly called', async () => {
    hoistedMocks.mockListDocuments.mockResolvedValue({
      total: 1,
      documents: mockMeals,
    })

    await getTodayMeals(userId)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(1)

    clearTodayMealsCache(userId)

    await getTodayMeals(userId)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache when a new meal is created', async () => {
    hoistedMocks.mockGet.mockResolvedValue({ $id: userId })
    hoistedMocks.mockListDocuments.mockResolvedValue({
      total: 1,
      documents: mockMeals,
    })
    hoistedMocks.mockCreateDocument.mockResolvedValue({
      $id: 'new-meal',
      owner: userId,
      type: 'Lunch',
      kcal: 400,
    })

    // 1. Load into cache
    await getTodayMeals(userId)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(1)

    // 2. Create a new meal (should clear cache)
    await createMeal({
      owner: userId,
      type: 'Lunch',
      kcal: 400,
    })

    // 3. Load again (should fetch from database)
    await getTodayMeals(userId)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache when an existing meal is updated', async () => {
    hoistedMocks.mockGet.mockResolvedValue({ $id: userId })
    hoistedMocks.mockListDocuments.mockResolvedValue({
      total: 1,
      documents: mockMeals,
    })
    hoistedMocks.mockUpdateDocument.mockResolvedValue({
      $id: 'meal-1',
      owner: userId,
      type: 'Breakfast',
      kcal: 600,
    })

    // 1. Load into cache
    await getTodayMeals(userId)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(1)

    // 2. Update existing meal (should clear cache)
    await updateMeal('meal-1', {
      kcal: 600,
    })

    // 3. Load again (should fetch from database)
    await getTodayMeals(userId)
    expect(hoistedMocks.mockListDocuments).toHaveBeenCalledTimes(2)
  })
})
