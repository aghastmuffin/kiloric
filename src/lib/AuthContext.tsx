import { account } from './appwrite';
import { purgeAccountData } from './accountDeletion';
import {
    clearAppwriteSession,
    persistAppwriteSession,
    restoreAppwriteSession,
} from './appwriteSession';
import { isValidEmail, isValidPassword } from './authValidation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

export function validateSignInInput(email: string, password: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email address.')
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be between 8 and 128 characters.')
  }
}

export function validateSignUpInput(email: string, password: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email address.')
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be between 8 and 128 characters.')
  }
}

export function validateSendPasswordResetInput(email: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email address.')
  }
}

export function validateConfirmPasswordResetInput(userId: string, secret: string, password: string): void {
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(userId)) {
    throw new Error('Invalid user ID format.')
  }
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('Invalid recovery secret.')
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be between 8 and 128 characters.')
  }
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
    validateSignInInput(email, password)
    const signedInUser = await establishSession(email, password)
    setUser(signedInUser)
    return Boolean(signedInUser?.$id)
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    validateSignUpInput(email, password)
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
    validateSendPasswordResetInput(email)
    await account.createRecovery({ email, url: passwordResetUrl() })
  }, [])

  const confirmPasswordReset = useCallback(
    async (userId: string, secret: string, password: string) => {
      validateConfirmPasswordResetInput(userId, secret, password)
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

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      confirmPasswordReset,
      deleteAccount,
    }),
    [confirmPasswordReset, deleteAccount, loading, sendPasswordReset, signIn, signOut, signUp, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
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
