// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { databases } from './appwrite'

// We mock all external dependencies of meals.ts to bypass transitive imports and avoid compiling React Native/Flow
vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {
      code: number
      type: string
      constructor(msg: string, code: number, type: string) {
        super(msg)
        this.code = code
        this.type = type
      }
    },
    ID: {
      unique: () => 'unique-id',
    },
    Permission: {
      read: (role: string) => `read:${role}`,
      update: (role: string) => `update:${role}`,
      delete: (role: string) => `delete:${role}`,
    },
    Role: {
      user: (userId: string) => `user:${userId}`,
    },
    Query: {
      equal: (field: string, value: any) => `equal:${field}:${value}`,
      greaterThanEqual: (field: string, value: any) => `greaterThanEqual:${field}:${value}`,
      orderDesc: (field: string) => `orderDesc:${field}`,
      limit: (val: number) => `limit:${val}`,
    },
  }
})

vi.mock('./appwrite', () => {
  return {
    account: {
      get: vi.fn(),
    },
    databases: {
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
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

let getTodayMeals: any
let clearTodayMealsCache: any

describe('meals caching and deduplication', () => {
  let listDocumentsSpy: any

  beforeAll(async () => {
    // Set mock env variables BEFORE importing meals.ts dynamically to avoid ESM hoisting evaluation issues
    process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID = 'test-db-id'
    process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID = 'test-collection-id'

    const mealsModule = await import('./meals')
    getTodayMeals = mealsModule.getTodayMeals
    clearTodayMealsCache = mealsModule.clearTodayMealsCache
  })

  beforeEach(() => {
    // Clear any active cache before each test
    clearTodayMealsCache('test-user-id')

    // Mock databases.listDocuments
    listDocumentsSpy = vi.spyOn(databases, 'listDocuments').mockImplementation(async () => {
      return {
        total: 1,
        documents: [
          {
            $id: 'meal-1',
            $createdAt: new Date().toISOString(),
            $collectionId: 'meals',
            $databaseId: 'main',
            $permissions: [],
            owner: 'test-user-id',
            kcal: 500,
            items: ['123456'],
          },
        ],
      } as any
    })
  })

  afterEach(() => {
    listDocumentsSpy.mockRestore()
    clearTodayMealsCache('test-user-id')
  })

  it('should deduplicate concurrent requests for the same user', async () => {
    // Call getTodayMeals concurrently multiple times
    const promises = [
      getTodayMeals('test-user-id'),
      getTodayMeals('test-user-id'),
      getTodayMeals('test-user-id'),
    ]

    const results = await Promise.all(promises)

    // Verify all returned the same documents
    expect(results[0]).toEqual(results[1])
    expect(results[1]).toEqual(results[2])
    expect(results[0][0].$id).toBe('meal-1')

    // Verify that databases.listDocuments was only called ONCE
    expect(listDocumentsSpy).toHaveBeenCalledTimes(1)
  })

  it('should serve cached results for sequential requests within TTL', async () => {
    // First call
    const firstResult = await getTodayMeals('test-user-id')
    expect(firstResult[0].$id).toBe('meal-1')
    expect(listDocumentsSpy).toHaveBeenCalledTimes(1)

    // Second call (sequential, within TTL)
    const secondResult = await getTodayMeals('test-user-id')
    expect(secondResult[0].$id).toBe('meal-1')

    // Verify listDocuments was NOT called again
    expect(listDocumentsSpy).toHaveBeenCalledTimes(1)
  })

  it('should fetch fresh data after cache is cleared', async () => {
    // First call
    await getTodayMeals('test-user-id')
    expect(listDocumentsSpy).toHaveBeenCalledTimes(1)

    // Clear cache
    clearTodayMealsCache('test-user-id')

    // Second call (after cache cleared)
    await getTodayMeals('test-user-id')

    // Verify listDocuments was called twice
    expect(listDocumentsSpy).toHaveBeenCalledTimes(2)
  })
})
