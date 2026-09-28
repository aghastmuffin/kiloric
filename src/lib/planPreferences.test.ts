// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'

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

let loadPlanPreferences: (expectedUserId?: string) => Promise<any>
let savePlanPreferences: (preferences: any, expectedUserId?: string) => Promise<any>
let createDefaultPlanPreferences: () => any

beforeAll(async () => {
  const planPrefsModule = await import('./planPreferences')
  loadPlanPreferences = planPrefsModule.loadPlanPreferences
  savePlanPreferences = planPrefsModule.savePlanPreferences
  createDefaultPlanPreferences = planPrefsModule.createDefaultPlanPreferences
})

describe('planPreferences security & authorization checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows loadPlanPreferences when no expectedUserId is provided or when user ID matches', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {
        calcountPlan: {
          sex: 'male',
          activity: 'active',
        },
      },
    })

    const prefs1 = await loadPlanPreferences()
    expect(prefs1.sex).toBe('male')
    expect(prefs1.activity).toBe('active')

    const prefs2 = await loadPlanPreferences('user_123')
    expect(prefs2.sex).toBe('male')
  })

  it('throws authorization error on loadPlanPreferences when expectedUserId mismatches active session (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    await expect(loadPlanPreferences('user_456')).rejects.toThrow(
      'Unauthorized: You can only view or manage your own plan preferences.',
    )
  })

  it('allows savePlanPreferences when expectedUserId matches active session', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })
    mockUpdatePrefs.mockResolvedValue({})

    const defaultPrefs = createDefaultPlanPreferences()
    const updated = await savePlanPreferences({ ...defaultPrefs, sex: 'male' }, 'user_123')

    expect(updated.sex).toBe('male')
    expect(mockUpdatePrefs).toHaveBeenCalledWith({
      prefs: {
        calcountPlan: expect.objectContaining({
          sex: 'male',
        }),
      },
    })
  })

  it('throws authorization error on savePlanPreferences when expectedUserId mismatches active session (BOLA prevention)', async () => {
    mockGetAccount.mockResolvedValue({
      $id: 'user_123',
      prefs: {},
    })

    const defaultPrefs = createDefaultPlanPreferences()
    await expect(
      savePlanPreferences(defaultPrefs, 'user_456'),
    ).rejects.toThrow(
      'Unauthorized: You can only view or manage your own plan preferences.',
    )

    expect(mockUpdatePrefs).not.toHaveBeenCalled()
  })
})
