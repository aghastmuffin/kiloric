// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { readStoredPreference } from './storedPreference'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(() => Promise.resolve()),
  },
}))

describe('readStoredPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the current key without reading the legacy key', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('paper')

    await expect(readStoredPreference('@kiloric/theme', '@calcount/theme')).resolves.toBe('paper')
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1)
    expect(AsyncStorage.setItem).not.toHaveBeenCalled()
  })

  it('copies a legacy value onto the current key', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce('ords')

    await expect(readStoredPreference('@kiloric/api_backend', '@calcount/api_backend')).resolves.toBe('ords')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@kiloric/api_backend', 'ords')
  })

  it('returns null when neither key is set', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null)

    await expect(readStoredPreference('@kiloric/font', '@calcount/font')).resolves.toBeNull()
    expect(AsyncStorage.setItem).not.toHaveBeenCalled()
  })
})
