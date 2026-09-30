// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createDefaultPlanPreferences,
  loadPlanPreferences,
  savePlanPreferences,
} from './planPreferences'

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

describe('planPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadPlanPreferences', () => {
    it('returns normalized plan preferences for authenticated user', async () => {
      mockGetAccount.mockResolvedValue({
        $id: 'user-123',
        prefs: {
          calcountPlan: {
            goal: 'gain',
            diet: 'low_carb',
          },
        },
      })

      const plan = await loadPlanPreferences()
      expect(plan.goal).toBe('gain')
      expect(plan.diet).toBe('low_carb')
      expect(mockGetAccount).toHaveBeenCalledTimes(1)
    })

    it('allows loading when expectedUserId matches authenticated user', async () => {
      mockGetAccount.mockResolvedValue({
        $id: 'user-123',
        prefs: {},
      })

      const plan = await loadPlanPreferences('user-123')
      expect(plan.goal).toBe('lose')
      expect(mockGetAccount).toHaveBeenCalledTimes(1)
    })

    it('throws authorization error when expectedUserId does not match authenticated user (BOLA/IDOR check)', async () => {
      mockGetAccount.mockResolvedValue({
        $id: 'user-123',
        prefs: {},
      })

      await expect(loadPlanPreferences('user-456')).rejects.toThrow(
        'Unauthorized: You can only view your own plan preferences.',
      )
    })
  })

  describe('savePlanPreferences', () => {
    it('updates user preferences successfully when expectedUserId matches', async () => {
      mockGetAccount.mockResolvedValue({
        $id: 'user-123',
        prefs: { existingPref: true },
      })
      mockUpdatePrefs.mockResolvedValue({})

      const defaultPlan = createDefaultPlanPreferences()
      defaultPlan.goal = 'maintain'

      const saved = await savePlanPreferences(defaultPlan, 'user-123')

      expect(saved.goal).toBe('maintain')
      expect(mockUpdatePrefs).toHaveBeenCalledWith({
        prefs: {
          existingPref: true,
          calcountPlan: saved,
        },
      })
    })

    it('throws authorization error when expectedUserId does not match authenticated user (BOLA/IDOR check)', async () => {
      mockGetAccount.mockResolvedValue({
        $id: 'user-123',
        prefs: {},
      })

      const defaultPlan = createDefaultPlanPreferences()

      await expect(
        savePlanPreferences(defaultPlan, 'user-456'),
      ).rejects.toThrow('Unauthorized: You can only update your own plan preferences.')

      expect(mockUpdatePrefs).not.toHaveBeenCalled()
    })
  })
})
