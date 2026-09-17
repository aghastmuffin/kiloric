import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  DEFAULT_SEARCH_MODE,
  clearSearchPreferencesCache,
  loadDefaultSearchMode,
  saveDefaultSearchMode,
} from './searchPreferences'

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {}
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key]
      }),
      clear: vi.fn(async () => {
        store = {}
      }),
    },
  }
})

describe('searchPreferences', () => {
  beforeEach(() => {
    clearSearchPreferencesCache()
    vi.clearAllMocks()
  })

  it('returns default search mode when no stored value exists', async () => {
    const mode = await loadDefaultSearchMode()
    expect(mode).toBe(DEFAULT_SEARCH_MODE)
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@calcount/default_search_mode')
  })

  it('uses in-memory cache on subsequent calls to avoid AsyncStorage bridge reads', async () => {
    await loadDefaultSearchMode()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    const cached = await loadDefaultSearchMode()
    expect(cached).toBe(DEFAULT_SEARCH_MODE)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent loadDefaultSearchMode requests', async () => {
    const [req1, req2] = await Promise.all([
      loadDefaultSearchMode(),
      loadDefaultSearchMode(),
    ])
    expect(req1).toBe(DEFAULT_SEARCH_MODE)
    expect(req2).toBe(DEFAULT_SEARCH_MODE)
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('synchronously updates cache and persists on saveDefaultSearchMode', async () => {
    await saveDefaultSearchMode('text_query')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@calcount/default_search_mode',
      'text_query',
    )

    const loaded = await loadDefaultSearchMode()
    expect(loaded).toBe('text_query')
    // No AsyncStorage.getItem call needed because cache was synchronously updated
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('resets cache state on clearSearchPreferencesCache', async () => {
    await saveDefaultSearchMode('text_query')
    clearSearchPreferencesCache()

    const reloaded = await loadDefaultSearchMode()
    expect(reloaded).toBe('text_query')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })
})
