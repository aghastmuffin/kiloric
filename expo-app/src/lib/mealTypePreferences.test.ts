// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  loadSelectedMealType,
  saveSelectedMealType,
  clearMealTypePreferencesCache,
  DEFAULT_MEAL_TYPE,
} from './mealTypePreferences'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('./serverData', () => ({
  client: { setSession: vi.fn() },
  account: { get: vi.fn() },
  databases: {},
}))

vi.mock('@/lib/serverTypes', () => ({
  PersistenceError: class extends Error {},
  ID: { unique: () => 'mock-id' },
  Permission: { read: () => '', update: () => '', delete: () => '' },
  Role: { user: () => '' },
  Query: {},
}))

describe('mealTypePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMealTypePreferencesCache()
  })

  it('loads default meal type when no saved value exists', async () => {
    const mealType = await loadSelectedMealType()
    expect(mealType).toBe(DEFAULT_MEAL_TYPE)
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@kiloric/selected_meal_type')
  })

  it('caches loaded meal type in memory to eliminate redundant AsyncStorage reads', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('Lunch')

    const firstCall = await loadSelectedMealType()
    expect(firstCall).toBe('Lunch')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Second call should return cached value synchronously from memory
    const secondCall = await loadSelectedMealType()
    expect(secondCall).toBe('Lunch')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent load operations into a single AsyncStorage request', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('Dinner')

    const [p1, p2] = await Promise.all([
      loadSelectedMealType(),
      loadSelectedMealType(),
    ])

    expect(p1).toBe('Dinner')
    expect(p2).toBe('Dinner')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('updates in-memory cache synchronously and persists to AsyncStorage on save', async () => {
    await saveSelectedMealType('Snack')

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@kiloric/selected_meal_type', 'Snack')

    // Immediate load returns 'Snack' without calling getItem
    const loaded = await loadSelectedMealType()
    expect(loaded).toBe('Snack')
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('clears in-memory cache when clearMealTypePreferencesCache is called', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('Breakfast')

    const initial = await loadSelectedMealType()
    expect(initial).toBe('Breakfast')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearMealTypePreferencesCache()

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('Lunch')
    const reloaded = await loadSelectedMealType()
    expect(reloaded).toBe('Lunch')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })

  it('keeps a saved custom meal type instead of dropping it', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('Pre-workout')
    expect(await loadSelectedMealType()).toBe('Pre-workout')
  })

  it('falls back to the default for over-long stored values', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('x'.repeat(17))
    expect(await loadSelectedMealType()).toBe(DEFAULT_MEAL_TYPE)
  })
})
