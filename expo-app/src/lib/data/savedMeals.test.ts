// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    get: vi.fn(),
    getPrefs: vi.fn(),
    updatePrefs: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

vi.mock('@/lib/serverData', () => ({
  account: { get: mocks.get, getPrefs: mocks.getPrefs, updatePrefs: mocks.updatePrefs },
  databases: {
    listDocuments: mocks.listDocuments,
    createDocument: mocks.createDocument,
    getDocument: mocks.getDocument,
    updateDocument: mocks.updateDocument,
    deleteDocument: mocks.deleteDocument,
  },
}))

vi.mock('@/lib/serverTypes', () => {
  class PersistenceError extends Error {
    code: number
    type: string
    constructor(message: string, code: number, type: string) {
      super(message)
      this.code = code
      this.type = type
    }
  }
  let counter = 0
  return {
    PersistenceError,
    ID: { unique: () => `id-${(counter += 1)}` },
    Permission: { read: (r: string) => `read(${r})`, update: (r: string) => `update(${r})`, delete: (r: string) => `delete(${r})` },
    Role: { user: (id: string) => `user:${id}` },
    Query: {
      equal: (field: string, value: unknown) => `equal:${field}:${value}`,
      greaterThanEqual: (field: string, value: unknown) => `gte:${field}:${value}`,
      lessThan: (field: string, value: unknown) => `lt:${field}:${value}`,
      lessThanEqual: (field: string, value: unknown) => `lte:${field}:${value}`,
      orderAsc: (field: string) => `asc:${field}`,
      orderDesc: (field: string) => `desc:${field}`,
      limit: (value: number) => `limit:${value}`,
    },
  }
})

const { resetRecordStoreSession } = await import('./recordStore')
const { deleteSavedMeal, listSavedMeals, parseSavedMealItems, saveMealFromEntries } = await import(
  './savedMeals'
)

let records: Record<string, unknown>[]

beforeEach(() => {
  vi.clearAllMocks()
  resetRecordStoreSession()
  records = []
  mocks.get.mockResolvedValue({ $id: 'u1' })
  mocks.createDocument.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    const record = { $id: `meal-${records.length + 1}`, $createdAt: '2026-01-01', $updatedAt: '2026-01-01', owner: 'u1', ...data }
    records.push(record)
    return record
  })
  mocks.listDocuments.mockImplementation(async () => ({ documents: [...records], total: records.length }))
  mocks.getDocument.mockImplementation(async ({ documentId }: { documentId: string }) => records.find((row) => row.$id === documentId))
  mocks.deleteDocument.mockImplementation(async ({ documentId }: { documentId: string }) => {
    records = records.filter((row) => row.$id !== documentId)
  })
})

describe('parseSavedMealItems', () => {
  it('parses valid items_json', () => {
    const json = JSON.stringify([
      { name: 'Oatmeal', servings: 1, kcal: 150, protein: 5, carbs: 27, fat: 3 },
    ])
    const parsed = parseSavedMealItems({ items_json: json, meal_type: 'Breakfast' })
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('Oatmeal')
    expect(parsed[0].meal_type).toBe('Breakfast')
  })

  it('returns empty array for invalid JSON or non-array', () => {
    expect(parseSavedMealItems({ items_json: 'invalid', meal_type: 'Breakfast' })).toEqual([])
    expect(parseSavedMealItems({ items_json: '{"a":1}', meal_type: 'Breakfast' })).toEqual([])
  })
})

describe('saveMealFromEntries & listSavedMeals', () => {
  it('throws when meal name is empty', async () => {
    await expect(saveMealFromEntries('u1', '  ', 'Breakfast', [])).rejects.toThrow('Give the meal a name.')
  })

  it('throws when entries array is empty', async () => {
    await expect(saveMealFromEntries('u1', 'My Breakfast', 'Breakfast', [])).rejects.toThrow(
      'Log at least one food before saving a meal.',
    )
  })

  it('saves a meal to the server', async () => {
    const mockEntries = [
      {
        $id: 'e1',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        owner: 'u1',
        day: '2026-01-01',
        logged_at: '2026-01-01T08:00:00Z',
        name: 'Eggs & Toast',
        brand: null,
        barcode: null,
        serving_label: '1 plate',
        serving_grams: 200,
        servings: 1,
        kcal: 350,
        protein: 20,
        carbs: 30,
        fat: 15,
        meal_type: 'Breakfast' as const,
        source: 'search' as const,
      },
    ]

    const saved = await saveMealFromEntries('u1', 'Healthy Breakfast', 'Breakfast', mockEntries)
    expect(saved.name).toBe('Healthy Breakfast')
    expect(saved.kcal).toBe(350)

    const list = await listSavedMeals('u1')
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Healthy Breakfast')
  })

  it('deletes saved meal', async () => {
    const mockEntries = [
      {
        $id: 'e1',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        owner: 'u1',
        day: '2026-01-01',
        logged_at: '2026-01-01T08:00:00Z',
        name: 'Apple',
        brand: null,
        barcode: null,
        serving_label: null,
        serving_grams: null,
        servings: 1,
        kcal: 95,
        protein: 0,
        carbs: 25,
        fat: 0,
        meal_type: 'Snack' as const,
        source: 'recent' as const,
      },
    ]

    const saved = await saveMealFromEntries('u1', 'Quick Snack', 'Snack', mockEntries)
    await deleteSavedMeal('u1', saved.$id)
    const list = await listSavedMeals('u1')
    expect(list).toHaveLength(0)
  })
})
