import { account } from '@/lib/appwrite'
import {
  clearAppwriteSession,
  persistAppwriteSession,
  restoreAppwriteSession,
} from '@/lib/appwriteSession'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ID, type Models } from 'react-native-appwrite'

type AppwriteUser = Models.User<Models.Preferences>

export type SignUpResult = 'signed_in' | 'verification_required'

type AuthContextValue = {
  user: AppwriteUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
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

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await establishSession(email, password))
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

  const signOut = useCallback(async () => {
    await account.deleteSession({ sessionId: 'current' })
    await clearAppwriteSession()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
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
