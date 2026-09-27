import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
    Models: {},
  }
})

let planPreferencesModule: typeof import('./planPreferences')

beforeAll(async () => {
  planPreferencesModule = await import('./planPreferences')
})

describe('planPreferences security & functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows loading plan preferences when expectedUserId matches or is omitted', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    const defaultPrefs = planPreferencesModule.createDefaultPlanPreferences()

    const prefsWithoutExpected = await planPreferencesModule.loadPlanPreferences()
    expect(prefsWithoutExpected).toEqual(defaultPrefs)

    const prefsWithMatchingExpected = await planPreferencesModule.loadPlanPreferences('user_123')
    expect(prefsWithMatchingExpected).toEqual(defaultPrefs)
  })

  it('throws authorization error when loadPlanPreferences is called for a different user ID (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    await expect(planPreferencesModule.loadPlanPreferences('user_456')).rejects.toThrow(
      'Unauthorized: You can only view or manage your own plan preferences.',
    )
  })

  it('allows saving plan preferences when expectedUserId matches or is omitted', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })
    mockUpdatePrefs.mockResolvedValue({})

    const prefsToSave = {
      ...planPreferencesModule.createDefaultPlanPreferences(),
      sex: 'male' as const,
      goal: 'gain' as const,
    }

    const saved = await planPreferencesModule.savePlanPreferences(prefsToSave, 'user_123')
    expect(saved.sex).toBe('male')
    expect(saved.goal).toBe('gain')
    expect(mockUpdatePrefs).toHaveBeenCalledTimes(1)
  })

  it('throws authorization error when savePlanPreferences is called for a different user ID (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    const prefsToSave = planPreferencesModule.createDefaultPlanPreferences()

    await expect(planPreferencesModule.savePlanPreferences(prefsToSave, 'user_456')).rejects.toThrow(
      'Unauthorized: You can only view or manage your own plan preferences.',
    )
    expect(mockUpdatePrefs).not.toHaveBeenCalled()
  })
})
