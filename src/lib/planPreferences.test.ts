// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const { mockGetAccount, mockUpdatePrefs } = vi.hoisted(() => {
  return {
    mockGetAccount: vi.fn(),
    mockUpdatePrefs: vi.fn(),
  }
})

vi.mock('./appwrite', () => {
  return {
    account: {
      get: mockGetAccount,
      updatePrefs: mockUpdatePrefs,
    },
  }
})

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {
      code: number
      type: string
      constructor(message: string, code: number, type: string) {
        super(message)
        this.code = code
        this.type = type
      }
    },
  }
})

let planPrefsModule: typeof import('./planPreferences')

beforeAll(async () => {
  planPrefsModule = await import('./planPreferences')
})

describe('planPreferences security & normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads preferences successfully when expectedUserId matches active session user ID', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {
        calcountPlan: {
          sex: 'male',
          activity: 'active',
          goal: 'lose',
          pace: 'moderate',
          diet: 'balanced',
          displayUnits: 'metric',
        },
      },
    })

    const result = await planPrefsModule.loadPlanPreferences('user_123')
    expect(result.sex).toBe('male')
    expect(result.activity).toBe('active')
    expect(mockGetAccount).toHaveBeenCalledTimes(1)
  })

  it('throws authorization error when loadPlanPreferences is called with a mismatched user ID', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123', prefs: {} })

    await expect(planPrefsModule.loadPlanPreferences('user_other')).rejects.toThrow(
      'Unauthorized: Plan preferences user mismatch.',
    )
  })

  it('saves preferences successfully when expectedUserId matches active session user ID', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123', prefs: {} })
    mockUpdatePrefs.mockResolvedValue({ $id: 'user_123' })

    const defaultPrefs = planPrefsModule.createDefaultPlanPreferences()
    await planPrefsModule.savePlanPreferences(defaultPrefs, 'user_123')

    expect(mockUpdatePrefs).toHaveBeenCalledWith({
      prefs: {
        calcountPlan: expect.objectContaining({
          sex: 'female',
          activity: 'moderate',
        }),
      },
    })
  })

  it('throws authorization error when savePlanPreferences is called with a mismatched user ID', async () => {
    mockGetAccount.mockResolvedValue({ $id: 'user_123', prefs: {} })

    const defaultPrefs = planPrefsModule.createDefaultPlanPreferences()
    await expect(
      planPrefsModule.savePlanPreferences(defaultPrefs, 'user_other'),
    ).rejects.toThrow('Unauthorized: Plan preferences user mismatch.')

    expect(mockUpdatePrefs).not.toHaveBeenCalled()
  })

  it('normalizes plan preferences correctly and clamps invalid values', () => {
    const normalized = planPrefsModule.normalizePlanPreferences({
      sex: 'male',
      activity: 'invalid_activity',
      goal: 'gain',
      pace: 'aggressive',
      diet: 'low_carb',
      targetWeightKg: 9999, // out of range
      displayUnits: 'imperial',
      overrides: {
        targetKcal: 2500,
        macroGrams: {
          protein: 180,
          carbs: 200,
          fat: 70,
        },
      },
    })

    expect(normalized.sex).toBe('male')
    expect(normalized.activity).toBe('moderate') // fell back to default
    expect(normalized.goal).toBe('gain')
    expect(normalized.pace).toBe('aggressive')
    expect(normalized.diet).toBe('low_carb')
    expect(normalized.targetWeightKg).toBeNull() // clamped to null because > 500
    expect(normalized.displayUnits).toBe('imperial')
    expect(normalized.overrides.targetKcal).toBe(2500)
    expect(normalized.overrides.macroGrams).toEqual({
      protein: 180,
      carbs: 200,
      fat: 70,
    })
  })
})
