import AsyncStorage from '@react-native-async-storage/async-storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSearchPreferencesCache,
  DEFAULT_SEARCH_MODE,
  loadDefaultSearchMode,
  saveDefaultSearchMode,
} from './searchPreferences'

describe('searchPreferences', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearSearchPreferencesCache()
  })

  it('returns DEFAULT_SEARCH_MODE when AsyncStorage is empty', async () => {
    vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null)
    const mode = await loadDefaultSearchMode()
    expect(mode).toBe(DEFAULT_SEARCH_MODE)
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@calcount/default_search_mode')
  })

  it('loads valid search mode from AsyncStorage and caches result', async () => {
    vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue('text_query')

    const first = await loadDefaultSearchMode()
    expect(first).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    // Second call should serve from in-memory cache without calling AsyncStorage.getItem again
    const second = await loadDefaultSearchMode()
    expect(second).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates inflight load promises when called concurrently', async () => {
    let resolveStorage: (val: string | null) => void = () => {}
    const storagePromise = new Promise<string | null>((resolve) => {
      resolveStorage = resolve
    })
    vi.spyOn(AsyncStorage, 'getItem').mockReturnValue(storagePromise)

    const p1 = loadDefaultSearchMode()
    const p2 = loadDefaultSearchMode()

    expect(p1).toBe(p2)

    resolveStorage('text_query')
    const [res1, res2] = await Promise.all([p1, p2])

    expect(res1).toBe('text_query')
    expect(res2).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('synchronously updates cache when saving search mode', async () => {
    vi.spyOn(AsyncStorage, 'setItem').mockResolvedValue()
    vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue('scan')

    await saveDefaultSearchMode('text_query')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@calcount/default_search_mode',
      'text_query',
    )

    // Subsequent load should immediately return the saved value from cache without calling getItem
    const mode = await loadDefaultSearchMode()
    expect(mode).toBe('text_query')
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('clears cache when clearSearchPreferencesCache is called', async () => {
    vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue('text_query')

    await loadDefaultSearchMode()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearSearchPreferencesCache()

    await loadDefaultSearchMode()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
