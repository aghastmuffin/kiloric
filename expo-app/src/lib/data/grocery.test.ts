import { describe, expect, it, vi } from 'vitest'

const mockCreate = vi.fn()
const mockList = vi.fn()
const mockUpdate = vi.fn()
const mockRemove = vi.fn()

vi.mock('@/lib/serverData', () => ({ account: {}, databases: {} }))
vi.mock('@/lib/serverTypes', () => ({
  PersistenceError: class extends Error {},
  ID: { unique: () => 'id' },
  Permission: { read: () => 'read', update: () => 'update', delete: () => 'delete' },
  Role: { user: (id: string) => `user:${id}` },
  Query: {},
}))

vi.mock('./recordStore', () => ({
  createRecordStore: () => ({
    create: (...args: unknown[]) => mockCreate(...args),
    list: (...args: unknown[]) => mockList(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  }),
  assertSessionUser: vi.fn(),
}))

const {
  addGroceryItem,
  deleteGroceryItem,
  listGroceryItems,
  setGroceryChecked,
  updateGroceryItem,
} = await import('./mealPlan')

describe('grocery items cloud sync and tagging', () => {
  it('creates a grocery item with meal and day tags', async () => {
    mockCreate.mockResolvedValueOnce({
      $id: 'g1',
      name: 'Eggs',
      quantity: '1 dozen',
      week_start: '2026-10-26',
      checked: false,
      meal: 'Breakfast',
      day: 'Tomorrow',
    })

    const result = await addGroceryItem('u1', '2026-10-26', 'Eggs', '1 dozen', 'Breakfast', 'Tomorrow')
    expect(mockCreate).toHaveBeenCalledWith('u1', {
      week_start: '2026-10-26',
      name: 'Eggs',
      quantity: '1 dozen',
      checked: false,
      meal: 'Breakfast',
      day: 'Tomorrow',
    })
    expect(result.name).toBe('Eggs')
    expect(result.meal).toBe('Breakfast')
    expect(result.day).toBe('Tomorrow')
  })

  it('updates checked status for sync', async () => {
    mockUpdate.mockResolvedValueOnce({
      $id: 'g1',
      checked: true,
    })

    const result = await setGroceryChecked('u1', 'g1', true)
    expect(mockUpdate).toHaveBeenCalledWith('u1', 'g1', { checked: true })
    expect(result.checked).toBe(true)
  })

  it('deletes item for sync', async () => {
    mockRemove.mockResolvedValueOnce(undefined)
    await deleteGroceryItem('u1', 'g1')
    expect(mockRemove).toHaveBeenCalledWith('u1', 'g1')
  })

  it('updates custom fields with updateGroceryItem', async () => {
    mockUpdate.mockResolvedValueOnce({
      $id: 'g1',
      meal: 'Lunch',
      day: 'Today',
    })

    const result = await updateGroceryItem('u1', 'g1', { meal: 'Lunch', day: 'Today' })
    expect(mockUpdate).toHaveBeenCalledWith('u1', 'g1', { meal: 'Lunch', day: 'Today' })
    expect(result.meal).toBe('Lunch')
  })
})
