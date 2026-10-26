import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAccount, mockListDocuments, mockCreateDocument, mockUpdateDocument, mockGetDocument, mockDeleteDocument } = vi.hoisted(() => ({
  mockGetAccount: vi.fn(),
  mockListDocuments: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockUpdateDocument: vi.fn(),
  mockGetDocument: vi.fn(),
  mockDeleteDocument: vi.fn(),
}))

let mockPrefs: Record<string, unknown> = {}

vi.mock('../appwrite', () => ({
  account: {
    get: mockGetAccount,
    getPrefs: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPrefs })),
    updatePrefs: vi.fn().mockImplementation((args: any) => {
      mockPrefs = { ...(args?.prefs ?? {}) }
      return Promise.resolve(mockPrefs)
    }),
  },
  databases: {
    listDocuments: mockListDocuments,
    createDocument: mockCreateDocument,
    updateDocument: mockUpdateDocument,
    getDocument: mockGetDocument,
    deleteDocument: mockDeleteDocument,
  },
}))

vi.mock('../meals', () => ({
  getTodayMeals: vi.fn().mockResolvedValue([]),
  getMeal: vi.fn().mockResolvedValue({ $id: 'meal_123', owner: 'user_123', type: 'Snack', kcal: 500, protein: 10, carbs: 50, fat: 10, items: [] }),
  createMeal: vi.fn().mockResolvedValue({ $id: 'meal_123', owner: 'user_123', type: 'Snack', kcal: 500, protein: 10, carbs: 50, fat: 10 }),
  updateMeal: vi.fn().mockImplementation((id, data) => Promise.resolve({ $id: id, ...data })),
  clearTodayMealsCache: vi.fn(),
  MEALS_COLLECTION_ID: 'meals',
}))

class MockAppwriteException extends Error {
  code = 404
  type = 'collection_not_found'
}

let idSeq = 0

vi.mock('react-native-appwrite', () => ({
  AppwriteException: MockAppwriteException,
  ID: { unique: () => `id_${++idSeq}` },
  Permission: { read: () => 'read', update: () => 'update', delete: () => 'delete' },
  Role: { user: (id: string) => `user:${id}` },
  Query: {
    equal: (f: string, v: any) => ({ field: f, op: 'eq', value: v }),
    greaterThanEqual: (f: string, v: any) => ({ field: f, op: 'gte', value: v }),
    lessThan: (f: string, v: any) => ({ field: f, op: 'lt', value: v }),
    orderDesc: (f: string) => ({ orderBy: f, desc: true }),
    limit: (l: number) => ({ limit: l }),
  },
}))

let foodLogModule: any
let overviewModule: any

beforeAll(async () => {
  mockGetAccount.mockResolvedValue({ $id: 'user_123', email: 'test@kiloricdev.co' })
  mockListDocuments.mockRejectedValue(new MockAppwriteException('Collection not found'))
  mockCreateDocument.mockRejectedValue(new MockAppwriteException('Collection not found'))
  mockUpdateDocument.mockRejectedValue(new MockAppwriteException('Collection not found'))
  mockGetDocument.mockRejectedValue(new MockAppwriteException('Collection not found'))
  mockDeleteDocument.mockRejectedValue(new MockAppwriteException('Collection not found'))

  foodLogModule = await import('./foodLog')
  overviewModule = await import('./overview')
})

beforeEach(() => {
  mockPrefs = {}
})

describe('foodLog unit tests', () => {
  it('foodItemFromEntry converts entry back to loggable FoodItem', () => {
    const entry = {
      $id: 'e1',
      $createdAt: '2026-10-16T12:00:00Z',
      $updatedAt: '2026-10-16T12:00:00Z',
      owner: 'user_123',
      meal_type: 'Snack' as const,
      name: 'Oats',
      brand: 'Quaker',
      barcode: '123456',
      serving_label: '1 cup',
      serving_grams: 80,
      servings: 2,
      kcal: 300,
      protein: 10,
      carbs: 50,
      fat: 6,
      day: '2026-10-16',
      logged_at: '2026-10-16T12:00:00Z',
    }

    const item = foodLogModule.foodItemFromEntry(entry)
    expect(item.name).toBe('Oats')
    expect(item.brand).toBe('Quaker')
    expect(item.servingGrams).toBe(80)
    expect(item.perServing.kcal).toBe(150)
    expect(item.perServing.protein).toBe(5)
  })

  it('logFood creates entry and updateFoodEntry modifies entry servings and meal type', async () => {
    const food = {
      name: 'Apple',
      brand: 'Fruit',
      barcode: '999888',
      servingGrams: 150,
      servingLabel: '1 apple',
      perServing: { kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    }

    const logged = await foodLogModule.logFood('user_123', {
      item: food,
      servings: 1,
      mealType: 'Snack',
      source: 'search',
    })

    expect(logged.name).toBe('Apple')
    expect(logged.servings).toBe(1)
    expect(logged.kcal).toBe(95)

    const updated = await foodLogModule.updateFoodEntry('user_123', logged, {
      servings: 2,
      mealType: 'Lunch',
    })

    expect(updated.servings).toBe(2)
    expect(updated.meal_type).toBe('Lunch')
    expect(updated.kcal).toBe(190)
  })

  it('loadStreak reflects deletion of only food entry for today', async () => {
    const food = {
      name: 'Banana',
      brand: 'Fruit',
      barcode: '777666',
      servingGrams: 120,
      servingLabel: '1 banana',
      perServing: { kcal: 105, protein: 1.3, carbs: 27, fat: 0.3 },
    }

    const entry = await foodLogModule.logFood('user_123', {
      item: food,
      servings: 1,
      mealType: 'Breakfast',
      source: 'search',
    })

    const streakWithEntry = await overviewModule.loadStreak('user_123')
    expect(streakWithEntry).toBeGreaterThanOrEqual(1)

    await foodLogModule.removeFoodEntry('user_123', entry)

    const entries = await foodLogModule.foodEntriesStore.list('user_123', [{ field: '$id', op: 'eq', value: entry.$id }])
    expect(entries.length).toBe(0)

    const streakAfterDelete = await overviewModule.loadStreak('user_123')
    expect(streakAfterDelete).toBe(0)
  })
})
