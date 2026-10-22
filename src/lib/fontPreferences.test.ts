import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearFontPreferencesCache,
  DEFAULT_FONT_CHOICE,
  loadFontChoice,
  saveFontChoice,
} from './fontPreferences'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}))

describe('fontPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFontPreferencesCache()
  })

  it('loads default font choice when AsyncStorage returns null', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)
    const result = await loadFontChoice()
    expect(result).toBe(DEFAULT_FONT_CHOICE)
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@kiloric/app_font_choice')
  })

  it('caches loaded font choice in memory to eliminate redundant AsyncStorage reads', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('mono')
    const first = await loadFontChoice()
    expect(first).toBe('mono')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    const second = await loadFontChoice()
    expect(second).toBe('mono')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent load operations into a single AsyncStorage request', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('custom')

    const [res1, res2] = await Promise.all([loadFontChoice(), loadFontChoice()])

    expect(res1).toBe('custom')
    expect(res2).toBe('custom')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('updates in-memory cache synchronously and persists to AsyncStorage on save', async () => {
    vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce()

    await saveFontChoice('mono')

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@kiloric/app_font_choice', 'mono')

    const value = await loadFontChoice()
    expect(value).toBe('mono')
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('clears in-memory cache via clearFontPreferencesCache', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('custom')
    await loadFontChoice()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearFontPreferencesCache()

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('default')
    await loadFontChoice()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
