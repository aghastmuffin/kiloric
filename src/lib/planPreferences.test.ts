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

vi.mock('react-native-appwrite', () => ({
  Models: {},
}))

vi.mock('./appwrite', () => ({
  account: {
    get: mockAccountGet,
    updatePrefs: mockUpdatePrefs,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('planPreferences normalization', () => {
  it('returns default preferences for invalid or empty inputs', () => {
    const defaults = createDefaultPlanPreferences()
    expect(normalizePlanPreferences(null)).toEqual(defaults)
    expect(normalizePlanPreferences(undefined)).toEqual(defaults)
    expect(normalizePlanPreferences('invalid')).toEqual(defaults)
  })

  it('normalizes valid partial preference objects correctly', () => {
    const custom = {
      sex: 'male',
      activity: 'active',
      goal: 'gain',
      pace: 'aggressive',
      diet: 'high_protein',
      targetWeightKg: 75,
      displayUnits: 'imperial',
      overrides: {
        targetKcal: 2800,
        dailyFluid: 3000,
        macroGrams: { protein: 180, carbs: 250, fat: 80 },
      },
    }

    const normalized = normalizePlanPreferences(custom)
    expect(normalized.sex).toBe('male')
    expect(normalized.activity).toBe('active')
    expect(normalized.goal).toBe('gain')
    expect(normalized.pace).toBe('aggressive')
    expect(normalized.diet).toBe('high_protein')
    expect(normalized.targetWeightKg).toBe(75)
    expect(normalized.displayUnits).toBe('imperial')
    expect(normalized.overrides.targetKcal).toBe(2800)
  })
})

describe('planPreferences security & authorization checks', () => {
  it('loads preferences when expectedUserId matches authenticated user', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {
        kiloricPlan: { sex: 'male', goal: 'gain' },
      },
    })

    const prefs = await loadPlanPreferences('user-123')
    expect(prefs.sex).toBe('male')
    expect(prefs.goal).toBe('gain')
  })

  it('loads preferences stored under the previous calcountPlan key', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {
        calcountPlan: { sex: 'male', goal: 'gain' },
      },
    })

    const prefs = await loadPlanPreferences('user-123')
    expect(prefs.sex).toBe('male')
    expect(prefs.goal).toBe('gain')
  })

  it('throws an authorization error when loadPlanPreferences is called for a different user ID (BOLA/IDOR prevention)', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })

    await expect(loadPlanPreferences('other-user-999')).rejects.toThrow(
      'Unauthorized: You are not permitted to modify preferences for another user.',
    )
  })

  it('saves preferences when expectedUserId matches authenticated user', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })
    mockUpdatePrefs.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: { kiloricPlan: createDefaultPlanPreferences() },
    })

    const defaults = createDefaultPlanPreferences()
    const saved = await savePlanPreferences(defaults, 'user-123')
    expect(saved).toEqual(defaults)
    expect(mockUpdatePrefs).toHaveBeenCalledWith({
      prefs: {
        kiloricPlan: defaults,
        calcountPlan: defaults,
      },
    })
  })

  it('throws an authorization error when savePlanPreferences is called for a different user ID (BOLA/IDOR prevention)', async () => {
    mockAccountGet.mockResolvedValueOnce({
      $id: 'user-123',
      prefs: {},
    })

    const defaults = createDefaultPlanPreferences()
    await expect(savePlanPreferences(defaults, 'other-user-999')).rejects.toThrow(
      'Unauthorized: You are not permitted to modify preferences for another user.',
    )
    expect(mockUpdatePrefs).not.toHaveBeenCalled()
  })
})
