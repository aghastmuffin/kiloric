// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  return {
    databases: {
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      getDocument: vi.fn(),
      deleteDocument: vi.fn(),
    },
    account: {
      get: vi.fn().mockResolvedValue({ $id: 'user-123' }),
    },
    logAppwriteError: vi.fn(),
    buildMealInputFromProduct: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    databases: mocks.databases,
    account: mocks.account,
  }
})

vi.mock('./profile', () => {
  return {
    logAppwriteError: mocks.logAppwriteError,
  }
})

vi.mock('./mealFromProduct', () => {
  return {
    buildMealInputFromProduct: mocks.buildMealInputFromProduct,
  }
})

vi.mock('react-native-appwrite', () => {
  class AppwriteException extends Error {
    code: number
    type: string
    constructor(message: string, code: number, type: string) {
      super(message)
      this.code = code
      this.type = type
    }
  }
  const ID = {
    unique: () => 'unique-id-123',
  }
  const Permission = {
    read: () => 'read',
    update: () => 'update',
    delete: () => 'delete',
  }
  const Role = {
    user: (id: string) => `user:${id}`,
  }
  const Query = {
    equal: (field: string, val: any) => `equal:${field}:${val}`,
    greaterThanEqual: (field: string, val: any) => `gte:${field}:${val}`,
    lessThan: (field: string, val: any) => `lt:${field}:${val}`,
    orderDesc: (field: string) => `orderDesc:${field}`,
    limit: (val: number) => `limit:${val}`,
    offset: (val: number) => `offset:${val}`,
  }
  return {
    AppwriteException,
    ID,
    Permission,
    Role,
    Query,
  }
})

let mealsModule: any

beforeAll(async () => {
  process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'db-123'
  process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID = 'coll-123'
  mealsModule = await import('./meals')
})

beforeEach(() => {
  vi.clearAllMocks()
  // Clean cache state by calling clearTodayMealsCache
  mealsModule.clearTodayMealsCache('user-123')
})

describe('getTodayMeals caching and deduplication', () => {
  it('should fetch today meals from database on first call and cache them', async () => {
    const mockMeals = [{ $id: 'meal-1', owner: 'user-123', kcal: 500 }]
    mocks.databases.listDocuments.mockResolvedValueOnce({ documents: mockMeals })

    // First call: should query database
    const meals1 = await mealsModule.getTodayMeals('user-123')
    expect(meals1).toEqual(mockMeals)
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)

    // Second call: should read from cache
    const meals2 = await mealsModule.getTodayMeals('user-123')
    expect(meals2).toEqual(mockMeals)
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1) // still 1
  })

  it('should deduplicate simultaneous parallel calls to getTodayMeals', async () => {
    const mockMeals = [{ $id: 'meal-2', owner: 'user-123', kcal: 600 }]

    // Create a deferred promise to simulate network delay
    let resolvePromise: any
    const networkPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mocks.databases.listDocuments.mockImplementation(() => networkPromise.then(() => ({ documents: mockMeals })))

    // Call getTodayMeals twice simultaneously
    const p1 = mealsModule.getTodayMeals('user-123')
    const p2 = mealsModule.getTodayMeals('user-123')

    // Expect they returned the exact same promise (deduplicated)
    expect(p1).toBe(p2)

    // Resolve network query
    resolvePromise()

    const [res1, res2] = await Promise.all([p1, p2])
    expect(res1).toEqual(mockMeals)
    expect(res2).toEqual(mockMeals)
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)
  })

  it('should invalidate cache when createMeal is called', async () => {
    const mockMeals = [{ $id: 'meal-3', owner: 'user-123', kcal: 400 }]
    mocks.databases.listDocuments.mockResolvedValue({ documents: mockMeals })

    // Call and populate cache
    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)

    // Call getTodayMeals again: reads from cache
    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)

    // Perform mutation (createMeal)
    mocks.databases.createDocument.mockResolvedValueOnce({ $id: 'new-meal', owner: 'user-123' })
    await mealsModule.createMeal({
      owner: 'user-123',
      type: 'Breakfast',
      kcal: 300,
    })

    // Call getTodayMeals again: cache is invalidated, so it should fetch again
    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache when updateMeal is called', async () => {
    const mockMeals = [{ $id: 'meal-4', owner: 'user-123', kcal: 450 }]
    mocks.databases.listDocuments.mockResolvedValue({ documents: mockMeals })

    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)

    // Perform mutation (updateMeal)
    mocks.databases.updateDocument.mockResolvedValueOnce({ $id: 'meal-4', owner: 'user-123', kcal: 500 })
    await mealsModule.updateMeal('meal-4', { kcal: 500 })

    // Fetch again: cache invalidated
    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache when moveProductBetweenMeals is called', async () => {
    const mockSourceMeal = { $id: 'source-meal', owner: 'user-123', items: ['barcode-1'], kcal: 100, type: 'Breakfast' }
    const mockTargetMeal = { $id: 'target-meal', owner: 'user-123', items: [], kcal: 0, type: 'Lunch' }

    mocks.databases.getDocument.mockResolvedValueOnce(mockSourceMeal)
    mocks.databases.listDocuments.mockResolvedValue({ documents: [mockSourceMeal, mockTargetMeal] })

    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)

    // Perform move mutation
    mocks.databases.deleteDocument.mockResolvedValueOnce({})
    mocks.databases.updateDocument.mockResolvedValue({ $id: 'target-meal', owner: 'user-123', items: ['barcode-1'], kcal: 100, type: 'Lunch' })

    await mealsModule.moveProductBetweenMeals(
      'user-123',
      'source-meal',
      'barcode-1',
      'Lunch',
      { kcal: 100, protein: 0, carbs: 0, fat: 0 }
    )

    // Fetch again: cache invalidated
    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(3) // 1 initial, 1 inside moveProductBetweenMeals, 1 post-mutation fetch
  })

  it('should invalidate cache when addProductToMeal is called', async () => {
    const mockMeals = [{ $id: 'meal-5', owner: 'user-123', kcal: 200, type: 'Breakfast', items: [] }]
    mocks.databases.listDocuments.mockResolvedValue({ documents: mockMeals })
    mocks.buildMealInputFromProduct.mockReturnValue({ kcal: 150 })

    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(1)

    // Add product
    mocks.databases.updateDocument.mockResolvedValueOnce({ $id: 'meal-5', owner: 'user-123', kcal: 350, items: ['barcode-5'] })
    await mealsModule.addProductToMeal('user-123', 'Breakfast', 'barcode-5', {}, 1)

    // Fetch again: cache invalidated
    await mealsModule.getTodayMeals('user-123')
    expect(mocks.databases.listDocuments).toHaveBeenCalledTimes(3) // 1 initial, 1 inside addProductToMeal, 1 post-mutation fetch
  })
})
