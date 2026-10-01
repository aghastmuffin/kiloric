// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetAccount, mockUpdatePrefs } = vi.hoisted(() => ({
  mockGetAccount: vi.fn(),
  mockUpdatePrefs: vi.fn(),
}))

vi.mock('./appwrite', () => ({
  account: {
    get: mockGetAccount,
    updatePrefs: mockUpdatePrefs,
  },
}))

vi.mock('react-native-appwrite', () => ({
  AppwriteException: class extends Error {},
}))

import {
  loadPlanPreferences,
  savePlanPreferences,
  normalizePlanPreferences,
  createDefaultPlanPreferences,
} from './planPreferences'

describe('planPreferences security & functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes invalid inputs to sensible default plan preferences', () => {
    const normalized = normalizePlanPreferences(null)
    expect(normalized).toEqual(createDefaultPlanPreferences())
  })

  it('loadPlanPreferences succeeds when expectedUserId matches active session user', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    const prefs = await loadPlanPreferences('user_123')
    expect(prefs).toEqual(createDefaultPlanPreferences())
    expect(mockGetAccount).toHaveBeenCalledTimes(1)
  })

  it('loadPlanPreferences throws authorization error when expectedUserId does not match active session user (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    await expect(loadPlanPreferences('other_user')).rejects.toThrow(
      'You can only view or manage your own plan preferences.',
    )
  })

  it('savePlanPreferences succeeds when expectedUserId matches active session user', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })
    mockUpdatePrefs.mockResolvedValue({})

    const defaults = createDefaultPlanPreferences()
    const result = await savePlanPreferences(defaults, 'user_123')

    expect(result).toEqual(defaults)
    expect(mockUpdatePrefs).toHaveBeenCalledTimes(1)
  })

  it('savePlanPreferences throws authorization error when expectedUserId does not match active session user (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    const defaults = createDefaultPlanPreferences()
    await expect(savePlanPreferences(defaults, 'other_user')).rejects.toThrow(
      'You can only view or manage your own plan preferences.',
    )

    expect(mockUpdatePrefs).not.toHaveBeenCalled()
  })
})
