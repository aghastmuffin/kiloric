import { account } from '@/lib/appwrite'
import { useAuth } from '@/lib/AuthContext'
import {
  createDefaultPlanPreferences,
  normalizePlanPreferences,
  planPreferencesFromUser,
  savePlanPreferences,
  type PlanPreferences,
} from '@/lib/planPreferences'
import {
  clearProfileCache,
  getProfile,
  isProfileComplete,
  saveProfileFields,
  type ProfileDocument,
  type ProfileFields,
} from '@/lib/profile'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type SaveAccountDetailsInput = {
  profile: Partial<ProfileFields>
  plan: PlanPreferences
  /** Sync Auth display name (usually username). */
  authName?: string | null
}

type ProfileContextValue = {
  profile: ProfileDocument | null
  plan: PlanPreferences
  loading: boolean
  isComplete: boolean
  refresh: () => Promise<void>
  saveAccountDetails: (input: SaveAccountDetailsInput) => Promise<ProfileDocument>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileDocument | null>(null)
  const [plan, setPlan] = useState<PlanPreferences>(createDefaultPlanPreferences)
  const [loading, setLoading] = useState(Boolean(user?.$id))

  const refresh = useCallback(async () => {
    if (!user?.$id) {
      setProfile(null)
      setPlan(createDefaultPlanPreferences())
      setLoading(false)
      return
    }

    try {
      const nextProfile = await getProfile(user.$id)
      setProfile(nextProfile)
      setPlan(planPreferencesFromUser(user))
    } catch (err) {
      console.warn('[ProfileContext] refresh failed', err)
      // Keep any previously loaded profile on transient network errors.
      setPlan(planPreferencesFromUser(user))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user?.$id) {
      clearProfileCache()
      setProfile(null)
      setPlan(createDefaultPlanPreferences())
      setLoading(false)
    }
  }, [user?.$id])

  const saveAccountDetails = useCallback(
    async (input: SaveAccountDetailsInput): Promise<ProfileDocument> => {
      if (!user?.$id) {
        throw new Error('Not signed in')
      }

      const savedProfile = (await saveProfileFields(
        user.$id,
        input.profile,
      )) as ProfileDocument

      const normalizedPlan = normalizePlanPreferences(input.plan)
      try {
        await savePlanPreferences(normalizedPlan)
      } catch (err) {
        // Profile document is the completeness gate; keep going so setup isn't blocked
        // if Auth prefs briefly fail. Lifestyle inputs stay in local state and retry on next save.
        console.warn('[ProfileContext] savePlanPreferences failed', err)
      }

      const trimmedName = input.authName?.trim()
      if (trimmedName && trimmedName !== user.name) {
        try {
          await account.updateName({ name: trimmedName.slice(0, 128) })
        } catch (err) {
          console.warn('[ProfileContext] updateName failed', err)
        }
      }

      try {
        await refreshUser()
      } catch (err) {
        console.warn('[ProfileContext] refreshUser after save failed', err)
      }

      setProfile(savedProfile)
      setPlan(normalizedPlan)
      return savedProfile
    },
    [refreshUser, user],
  )

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      plan,
      loading,
      isComplete: isProfileComplete(profile),
      refresh,
      saveAccountDetails,
    }),
    [profile, plan, loading, refresh, saveAccountDetails],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return context
}
