// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearSearchPreferencesCache,
  loadDefaultSearchMode,
  saveDefaultSearchMode,
  DEFAULT_SEARCH_MODE,
} from './searchPreferences'

const mockStorage: Record<string, string> = {}

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key]
      return Promise.resolve()
    }),
  },
}))

describe('searchPreferences with in-memory caching and request deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key]
    }
    clearSearchPreferencesCache()
  })

  it('loads default search mode from storage and caches the result', async () => {
    mockStorage['@calcount/default_search_mode'] = 'text_query'

    // First load hits AsyncStorage
    const mode1 = await loadDefaultSearchMode()
    expect(mode1).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Second load returns cached value without calling AsyncStorage again
    const mode2 = await loadDefaultSearchMode()
    expect(mode2).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests to loadDefaultSearchMode', async () => {
    mockStorage['@calcount/default_search_mode'] = 'text_query'

    const [res1, res2] = await Promise.all([
      loadDefaultSearchMode(),
      loadDefaultSearchMode(),
    ])

    expect(res1).toBe('text_query')
    expect(res2).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('synchronously updates memory cache when saveDefaultSearchMode is called', async () => {
    await saveDefaultSearchMode('text_query')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@calcount/default_search_mode', 'text_query')

    // Immediate read gets new value without hitting AsyncStorage getItem
    const mode = await loadDefaultSearchMode()
    expect(mode).toBe('text_query')
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('clearSearchPreferencesCache resets in-memory cache state', async () => {
    mockStorage['@calcount/default_search_mode'] = 'text_query'

    // First load to populate cache
    await loadDefaultSearchMode()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Clear cache
    clearSearchPreferencesCache()

    // Subsequent load reads from AsyncStorage again
    const mode = await loadDefaultSearchMode()
    expect(mode).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })

  it('returns default fallback when storage is empty or contains invalid value', async () => {
    mockStorage['@calcount/default_search_mode'] = 'invalid_mode'

    const mode = await loadDefaultSearchMode()
    expect(mode).toBe(DEFAULT_SEARCH_MODE)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })
})
