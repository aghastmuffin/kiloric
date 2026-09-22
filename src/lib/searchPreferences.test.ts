// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  DEFAULT_SEARCH_MODE,
  clearSearchPreferencesCache,
  loadDefaultSearchMode,
  saveDefaultSearchMode,
} from './searchPreferences'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}))

describe('searchPreferences in-memory caching & deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSearchPreferencesCache()
  })

  it('returns DEFAULT_SEARCH_MODE when AsyncStorage is empty', async () => {
    const mode = await loadDefaultSearchMode()
    expect(mode).toBe(DEFAULT_SEARCH_MODE)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('caches the loaded value in memory and avoids subsequent AsyncStorage getItem calls', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('text_query')

    const firstCall = await loadDefaultSearchMode()
    expect(firstCall).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    const secondCall = await loadDefaultSearchMode()
    expect(secondCall).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent loadDefaultSearchMode requests', async () => {
    vi.mocked(AsyncStorage.getItem).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('text_query'), 20)),
    )

    const [res1, res2] = await Promise.all([
      loadDefaultSearchMode(),
      loadDefaultSearchMode(),
    ])

    expect(res1).toBe('text_query')
    expect(res2).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('updates memory cache synchronously on saveDefaultSearchMode', async () => {
    await saveDefaultSearchMode('text_query')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@calcount/default_search_mode',
      'text_query',
    )

    // Should return directly from memory without calling getItem
    const cached = await loadDefaultSearchMode()
    expect(cached).toBe('text_query')
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('prevents stale in-flight loads from overwriting concurrent saves', async () => {
    let resolveLoad!: (value: string | null) => void
    vi.mocked(AsyncStorage.getItem).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )

    const loadPromise = loadDefaultSearchMode()

    // Save happens while load is in flight
    await saveDefaultSearchMode('text_query')

    // In-flight load finishes returning stale value
    resolveLoad('scan')
    const loadedMode = await loadPromise

    expect(loadedMode).toBe('text_query')

    const cachedMode = await loadDefaultSearchMode()
    expect(cachedMode).toBe('text_query')
  })

  it('clears memory cache when clearSearchPreferencesCache is called', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('text_query')

    const first = await loadDefaultSearchMode()
    expect(first).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearSearchPreferencesCache()

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('scan')
    const second = await loadDefaultSearchMode()
    expect(second).toBe('scan')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
