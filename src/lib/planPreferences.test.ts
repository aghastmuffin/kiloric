// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDefaultPlanPreferences,
  loadPlanPreferences,
  normalizePlanPreferences,
  savePlanPreferences,
} from './planPreferences'

const { mockAccountGet, mockUpdatePrefs } = vi.hoisted(() => ({
  mockAccountGet: vi.fn(),
  mockUpdatePrefs: vi.fn(),
}))

vi.mock('./appwrite', () => ({
  account: {
    get: mockAccountGet,
    updatePrefs: mockUpdatePrefs,
  },
}))

vi.mock('react-native-appwrite', () => ({
  AppwriteException: class extends Error {},
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('planPreferences normalization', () => {
  it('returns default preferences for invalid or non-object inputs', () => {
    const defaults = createDefaultPlanPreferences()
    expect(normalizePlanPreferences(null)).toEqual(defaults)
    expect(normalizePlanPreferences(undefined)).toEqual(defaults)
    expect(normalizePlanPreferences('invalid')).toEqual(defaults)
    expect(normalizePlanPreferences([])).toEqual(defaults)
  })

  it('normalizes valid partial preference objects with bounds checking', () => {
    const input = {
      sex: 'male',
      activity: 'active',
      goal: 'gain',
      pace: 'aggressive',
      diet: 'high_protein',
      targetWeightKg: 85,
      displayUnits: 'imperial',
      overrides: {
        targetKcal: 3200,
        dailyFluid: 3500,
        macroGrams: { protein: 200, carbs: 350, fat: 80 },
      },
    }

    const normalized = normalizePlanPreferences(input)
    expect(normalized.sex).toBe('male')
    expect(normalized.activity).toBe('active')
    expect(normalized.goal).toBe('gain')
    expect(normalized.pace).toBe('aggressive')
    expect(normalized.diet).toBe('high_protein')
    expect(normalized.targetWeightKg).toBe(85)
    expect(normalized.displayUnits).toBe('imperial')
    expect(normalized.overrides.targetKcal).toBe(3200)
    expect(normalized.overrides.dailyFluid).toBe(3500)
    expect(normalized.overrides.macroGrams).toEqual({ protein: 200, carbs: 350, fat: 80 })
  })
})

describe('planPreferences security & BOLA authorization', () => {
  it('allows loadPlanPreferences when expectedUserId matches authenticated user ID', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })

    const prefs = await loadPlanPreferences('user-123')
    expect(prefs).toEqual(createDefaultPlanPreferences())
  })

  it('throws authorization error when loadPlanPreferences is called for a different user ID (BOLA prevention)', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })

    await expect(loadPlanPreferences('user-999')).rejects.toThrow(
      'Unauthorized: You can only view or manage your own plan preferences.',
    )
  })

  it('allows savePlanPreferences when expectedUserId matches authenticated user ID', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })
    mockUpdatePrefs.mockResolvedValueOnce({})

    const defaults = createDefaultPlanPreferences()
    await expect(savePlanPreferences(defaults, 'user-123')).resolves.toEqual(defaults)
    expect(mockUpdatePrefs).toHaveBeenCalled()
  })

  it('throws authorization error when savePlanPreferences is called for a different user ID (BOLA prevention)', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })

    const defaults = createDefaultPlanPreferences()
    await expect(savePlanPreferences(defaults, 'user-999')).rejects.toThrow(
      'Unauthorized: You can only view or manage your own plan preferences.',
    )
    expect(mockUpdatePrefs).not.toHaveBeenCalled()
  })
})
