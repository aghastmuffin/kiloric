import { account } from '@/lib/appwrite';
import { purgeAccountData } from '@/lib/accountDeletion';
import {
    clearAppwriteSession,
    persistAppwriteSession,
    restoreAppwriteSession,
} from '@/lib/appwriteSession';
import { clearFoodFavoritesCache } from '@/lib/foodFavorites';
import { clearProfileCache } from '@/lib/profile';
import { clearRecentFoodsCache } from '@/lib/recentFoods';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { ID, type Models } from 'react-native-appwrite';

type AppwriteUser = Models.User<Models.Preferences>

export type SignUpResult = 'signed_in' | 'verification_required'

type AuthContextValue = {
  user: AppwriteUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (userId: string, secret: string, password: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

async function establishSession(email: string, password: string): Promise<AppwriteUser> {
  const session = await account.createEmailPasswordSession({ email, password })
  await persistAppwriteSession(session)
  return account.get()
}

function passwordResetUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`
  }
  return 'calorie://reset-password'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      await restoreAppwriteSession()
      setUser(await account.get())
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    const signedInUser = await establishSession(email, password)
    setUser(signedInUser)
    return Boolean(signedInUser?.$id)
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    await account.create({ userId: ID.unique(), email, password })

    try {
      setUser(await establishSession(email, password))
      return 'signed_in'
    } catch {
      return 'verification_required'
    }
  }, [])

  const clearUserState = useCallback(async () => {
    await clearAppwriteSession()
    clearProfileCache()
    clearRecentFoodsCache()
    clearFoodFavoritesCache()
    setUser(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: 'current' })
    } finally {
      await clearUserState()
    }
  }, [clearUserState])

  const sendPasswordReset = useCallback(async (email: string) => {
    await account.createRecovery({ email, url: passwordResetUrl() })
  }, [])

  const confirmPasswordReset = useCallback(
    async (userId: string, secret: string, password: string) => {
      await account.updateRecovery({ userId, secret, password })
    },
    [],
  )

  const deleteAccount = useCallback(async () => {
    if (!user?.$id) throw new Error('No signed-in account to delete.')

    // Client permissions remove the profile immediately. Appwrite then blocks
    // the authentication record permanently; remaining service records are
    // purged under the documented retention process.
    await purgeAccountData(user.$id)
    await account.updateStatus()
    await clearUserState()
  }, [clearUserState, user])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        confirmPasswordReset,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function getAuthErrorMessage(err: unknown): string {
  return authErrorMessage(err)
}
