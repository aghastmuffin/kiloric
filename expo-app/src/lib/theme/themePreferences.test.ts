import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearThemePreferencesCache,
  DEFAULT_THEME_CHOICE,
  loadThemeChoice,
  saveThemeChoice,
} from './themePreferences'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}))

describe('themePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearThemePreferencesCache()
  })

  it('loads default theme choice when AsyncStorage returns null', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)
    const result = await loadThemeChoice()
    expect(result).toBe(DEFAULT_THEME_CHOICE)
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@kiloric/app_theme_choice')
  })

  it('caches loaded theme choice in memory to eliminate redundant AsyncStorage reads', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('paper')
    const first = await loadThemeChoice()
    expect(first).toBe('paper')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    const second = await loadThemeChoice()
    expect(second).toBe('paper')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent load operations into a single AsyncStorage request', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('ios')

    const [res1, res2] = await Promise.all([loadThemeChoice(), loadThemeChoice()])

    expect(res1).toBe('ios')
    expect(res2).toBe('ios')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('updates in-memory cache synchronously and persists to AsyncStorage on save', async () => {
    vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce()

    await saveThemeChoice('barebones')

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@kiloric/app_theme_choice', 'barebones')

    const value = await loadThemeChoice()
    expect(value).toBe('barebones')
    expect(AsyncStorage.getItem).not.toHaveBeenCalled()
  })

  it('clears in-memory cache via clearThemePreferencesCache', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('paper')
    await loadThemeChoice()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)

    clearThemePreferencesCache()

    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('kiloric')
    await loadThemeChoice()
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2)
  })
})
